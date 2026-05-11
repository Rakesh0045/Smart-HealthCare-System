package com.healthcare.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.healthcare.dto.response.ChatResponse;
import com.healthcare.entity.*;
import com.healthcare.exception.ResourceNotFoundException;
import com.healthcare.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class HealthAssistantService {

    private final TreatmentEpisodeRepository episodeRepo;
    private final MedicalRecordRepository medicalRecordRepo;
    private final PatientRepository patientRepo;
    private final PrescriptionRepository prescriptionRepo;
    private final AppointmentRepository appointmentRepo;
    private final EpisodeFollowupRepository followupRepo;
    private final AuditLogService auditLogService;
    private final ObjectMapper objectMapper;

    @Value("${app.gemini.api-key:}")
    private String geminiApiKey;

    @Value("${app.openai.api-key:}")
    private String openAiApiKey;

    @Value("${app.openai.model:gpt-4o-mini}")
    private String openAiModel;

    @Value("${app.openai.base-url:https://openrouter.ai/api/v1/chat/completions}")
    private String openAiBaseUrl;

    // In-memory conversation history per session (sessionKey -> message list)
    private final ConcurrentHashMap<String, List<Map<String, String>>> conversationHistory = new ConcurrentHashMap<>();

    private static final int MAX_HISTORY_TURNS = 8; // keep last 8 exchanges
    private static final String SYSTEM_PROMPT = """
            You are MediCare Clinical Assistant — a calm, human, clinically cautious assistant with access to this patient's real medical data.

            RULES:
            1. Answer ONLY from the provided patient context. Never invent clinical data.
            2. Keep replies short, clear, and human. Prefer 2-5 short sentences or 2-4 bullets.
            3. Start with the direct answer first, then give 1-3 practical next steps.
            4. Always include at least one concrete suggestion the patient can act on now.
            5. For diagnosis, medicines, dose changes, or anything risky, advise checking with the doctor.
            6. Use citations with record/episode IDs from the context.
            7. If the context is missing key facts, say that plainly and suggest the right question to ask.
            8. Keep a friendly tone. Avoid robotic wording, disclaimers at the start, and unnecessary detail.
            9. IMPORTANT FORMATTING: Do NOT use Markdown. Use plain text or simple HTML tags only (like <b>, <i>, <br>, <ul>, <li>).
            10. Suggested actions must be useful and specific. Use 2-4 items with short labels like "Book an appointment", "Review records", or "Ask about medicines".

            Return ONLY valid JSON in this exact format:
            {
                "reply": "your response here",
                "citations": [{"type": "record|episode|prescription", "id": 123, "snippet": "brief reference"}],
                "suggestedActions": [{"type": "appointment|prescription|record|general", "label": "action label", "data": {}}],
                "confidence": "high|medium|low"
            }
            """;

    /**
     * Main chat entry point — supports both episode-scoped and global history chat.
     * sessionId is used to maintain conversation continuity.
     */
    @Transactional(readOnly = true)
    public ChatResponse chat(Long patientId, String message, Long episodeId,
            Long actingUserId, String role) {
        return chat(patientId, message, episodeId, actingUserId, role,
                buildSessionKey(actingUserId, patientId, episodeId));
    }

    public ChatResponse chat(Long patientId, String message, Long episodeId,
            Long actingUserId, String role, String sessionId) {
        Patient patient = patientRepo.findWithUserById(patientId)
                .orElseThrow(() -> new ResourceNotFoundException("Patient", patientId));

        String context;
        try {
            context = buildRichContext(patient, episodeId);
        } catch (Exception e) {
            log.error("Failed to build patient context for patient={} episode={}", patientId, episodeId, e);
            return fallbackResponse("context build");
        }
        List<Map<String, String>> history = getOrCreateHistory(sessionId);

        ChatResponse response;
        try {
            response = callLLMWithHistory(context, message, history);
        } catch (Exception e) {
            log.error("LLM call failed for patient={} episode={}: {}", patientId, episodeId, e.getMessage(), e);
            response = fallbackResponse(message);
        }

        // Update history
        history.add(Map.of("role", "user", "content", message));
        history.add(Map.of("role", "assistant", "content", response.getReply()));
        trimHistory(history);
        conversationHistory.put(sessionId, history);

        auditLogService.log(actingUserId, "HEALTH_ASSISTANT_QUERIED", "Patient", patientId,
                String.format("role=%s episodeId=%s sessionId=%s confidence=%s",
                        role, episodeId, sessionId, response.getConfidence()));

        return response;
    }

    /** Clear session history (called when patient starts new chat) */
    public void clearSession(String sessionId) {
        conversationHistory.remove(sessionId);
    }

    /**
     * Generate AI insights summary for an episode — richer than lifestyle advice
     */
    @Transactional(readOnly = true)
    public ChatResponse generateEpisodeInsights(Long episodeId, Long actingUserId, String role) {
        TreatmentEpisode episode = episodeRepo.findById(episodeId)
                .orElseThrow(() -> new ResourceNotFoundException("TreatmentEpisode", episodeId));

        Patient patient = patientRepo.findWithUserById(episode.getPatient().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Patient", episode.getPatient().getId()));

        String context;
        try {
            context = buildRichContext(patient, episodeId);
        } catch (Exception e) {
            log.error("Failed to build patient context for episode insights: {}", e.getMessage(), e);
            return fallbackResponse("context build");
        }

        String insightPrompt = """
                Based on the patient's episode data, provide a comprehensive clinical insights summary including:
                1. Disease progression overview
                2. Medication adherence patterns (if data available)
                3. Key lab/diagnostic trends (if data available)
                4. Risk factors to watch
                5. Recommended next steps for the care team

                Be specific, data-driven, and clinically useful. Cite record IDs.
                """;

        ChatResponse response;
        try {
            response = callLLMDirect(context, insightPrompt);
        } catch (Exception e) {
            log.error("Episode insights failed for episodeId={}: {}", episodeId, e.getMessage());
            response = fallbackResponse("episode insights");
        }

        auditLogService.log(actingUserId, "EPISODE_INSIGHTS_GENERATED", "TreatmentEpisode", episodeId,
                String.format("role=%s confidence=%s", role, response.getConfidence()));

        return response;
    }

    /** Generate a full patient history summary across all episodes */
    @Transactional(readOnly = true)
    public ChatResponse generateHistorySummary(Long patientId, Long actingUserId, String role) {
        Patient patient = patientRepo.findWithUserById(patientId)
                .orElseThrow(() -> new ResourceNotFoundException("Patient", patientId));

        String context;
        try {
            context = buildRichContext(patient, null);
        } catch (Exception e) {
            log.error("Failed to build patient context for history summary: {}", e.getMessage(), e);
            return fallbackResponse("context build");
        }

        String summaryPrompt = """
                Provide a comprehensive medical history summary for this patient covering:
                1. Overall health profile and chronic conditions
                2. Treatment history timeline
                3. Medication history and known allergies
                4. Key health events and outcomes
                5. Preventive care recommendations

                Be concise but thorough. This will be shown to the patient as their health overview.
                """;

        ChatResponse response;
        try {
            response = callLLMDirect(context, summaryPrompt);
        } catch (Exception e) {
            log.error("History summary failed for patientId={}: {}", patientId, e.getMessage());
            response = fallbackResponse("history summary");
        }

        auditLogService.log(actingUserId, "HISTORY_SUMMARY_GENERATED", "Patient", patientId,
                String.format("role=%s confidence=%s", role, response.getConfidence()));

        return response;
    }

    // ─── Context Building ──────────────────────────────────────────────────────

    private String buildRichContext(Patient patient, Long episodeId) {
        StringBuilder ctx = new StringBuilder();

        // Patient basics
        ctx.append("=== PATIENT PROFILE ===\n");
        ctx.append("Name: ").append(patient.getUser().getName()).append("\n");
        ctx.append("Gender: ").append(patient.getGender() != null ? patient.getGender() : "Not specified").append("\n");
        if (patient.getDateOfBirth() != null) {
            ctx.append("DOB: ").append(patient.getDateOfBirth()).append("\n");
        }
        ctx.append("Blood Group: ").append(patient.getBloodGroup() != null ? patient.getBloodGroup() : "Not recorded")
                .append("\n");
        ctx.append("Allergies: ").append(patient.getAllergies() != null ? patient.getAllergies() : "None known")
                .append("\n");
        if (patient.getMedicalHistory() != null) {
            ctx.append("Medical History Notes: ").append(patient.getMedicalHistory()).append("\n");
        }

        // Prescriptions (active/recent)
        List<Prescription> prescriptions = prescriptionRepo.findByPatientIdOrderByCreatedAtDesc(patient.getId());
        if (!prescriptions.isEmpty()) {
            ctx.append("\n=== CURRENT & RECENT PRESCRIPTIONS ===\n");
            prescriptions.stream().limit(5).forEach(p -> {
                ctx.append("Prescription #").append(p.getId()).append(" (").append(p.getCreatedAt().toLocalDate())
                        .append(")\n");
                ctx.append("  Diagnosis: ").append(p.getDiagnosis()).append("\n");
                if (p.getMedicines() != null && !p.getMedicines().isEmpty()) {
                    ctx.append("  Medicines:\n");
                    p.getMedicines().forEach(m -> ctx.append("    - ").append(m.getMedicineName())
                            .append(" | ").append(m.getDosage() != null ? m.getDosage() : "")
                            .append(" | ").append(m.getFrequency() != null ? m.getFrequency() : "")
                            .append(" | ").append(m.getDuration() != null ? m.getDuration() : "")
                            .append("\n"));
                }
                if (p.getAdditionalNotes() != null) {
                    ctx.append("  Notes: ").append(p.getAdditionalNotes()).append("\n");
                }
                if (p.getFollowUpDate() != null) {
                    ctx.append("  Follow-up due: ").append(p.getFollowUpDate()).append("\n");
                }
            });
        }

        // Episode-specific context
        if (episodeId != null) {
            TreatmentEpisode episode = episodeRepo.findById(episodeId).orElse(null);
            if (episode != null) {
                ctx.append("\n=== ACTIVE TREATMENT EPISODE ===\n");
                ctx.append("Episode #").append(episode.getId()).append(": ").append(episode.getEpisodeName())
                        .append("\n");
                ctx.append("Diagnosis: ")
                        .append(episode.getPrimaryDiagnosis() != null ? episode.getPrimaryDiagnosis() : "Not set")
                        .append("\n");
                ctx.append("Category: ")
                        .append(episode.getConditionCategory() != null ? episode.getConditionCategory() : "General")
                        .append("\n");
                ctx.append("Status: ").append(episode.getStatus()).append("\n");
                ctx.append("Start Date: ").append(episode.getStartDate()).append("\n");
                if (episode.getEndDate() != null) {
                    ctx.append("End Date: ").append(episode.getEndDate()).append("\n");
                }

                // Followups for this episode (fetch via repository to avoid lazy-init outside
                // session)
                List<com.healthcare.entity.EpisodeFollowup> followups = followupRepo
                        .findByEpisodeIdOrderByCreatedAtDesc(episodeId);
                if (followups != null && !followups.isEmpty()) {
                    ctx.append("Follow-ups:\n");
                    followups.forEach(f -> {
                        ctx.append("  - ").append(f.getFollowupType()).append(" | ");
                        if (f.getFollowupPurpose() != null)
                            ctx.append(f.getFollowupPurpose());
                        if (f.getNotes() != null)
                            ctx.append(" | Notes: ").append(f.getNotes());
                        ctx.append("\n");
                    });
                }

                // Medical records for this episode
                List<com.healthcare.entity.MedicalRecord> episodeRecords = medicalRecordRepo.findByEpisodeId(episodeId);
                if (!episodeRecords.isEmpty()) {
                    ctx.append("Episode Records:\n");
                    episodeRecords.forEach(r -> {
                        ctx.append("  Record #").append(r.getId()).append(" [").append(r.getRecordType()).append("] ");
                        ctx.append(r.getTitle()).append(" (").append(r.getRecordDate()).append(")\n");
                        if (r.getSummary() != null)
                            ctx.append("    Summary: ").append(r.getSummary()).append("\n");
                        if (r.getDetails() != null && r.getDetails().length() < 300) {
                            ctx.append("    Details: ").append(r.getDetails()).append("\n");
                        }
                    });
                }

                if (episode.getAiLifestyleAdvice() != null) {
                    ctx.append("AI Lifestyle Advice: ").append(episode.getAiLifestyleAdvice(), 0,
                            Math.min(200, episode.getAiLifestyleAdvice().length())).append("...\n");
                }
            }
        } else {
            // Global context — all episodes summary
            List<TreatmentEpisode> allEpisodes = episodeRepo.findByPatientIdOrderByStartDateDesc(patient.getId());
            if (!allEpisodes.isEmpty()) {
                ctx.append("\n=== TREATMENT EPISODES SUMMARY ===\n");
                allEpisodes.stream().limit(5).forEach(e -> {
                    ctx.append("Episode #").append(e.getId()).append(": ").append(e.getEpisodeName())
                            .append(" | Status: ").append(e.getStatus())
                            .append(" | Diagnosis: ")
                            .append(e.getPrimaryDiagnosis() != null ? e.getPrimaryDiagnosis() : "N/A")
                            .append(" | ").append(e.getStartDate())
                            .append(e.getEndDate() != null ? " to " + e.getEndDate() : " (ongoing)")
                            .append("\n");
                });
            }

            // Recent medical records across all episodes
            List<com.healthcare.entity.MedicalRecord> recentRecords = medicalRecordRepo
                    .findTop5ByPatientIdOrderByRecordDateDesc(patient.getId());
            if (!recentRecords.isEmpty()) {
                ctx.append("\n=== RECENT MEDICAL RECORDS ===\n");
                recentRecords.forEach(r -> {
                    ctx.append("Record #").append(r.getId()).append(" [").append(r.getRecordType()).append("] ");
                    ctx.append(r.getTitle()).append(" (").append(r.getRecordDate()).append(")\n");
                    if (r.getSummary() != null)
                        ctx.append("  Summary: ").append(r.getSummary()).append("\n");
                });
            }
        }

        // Appointment history summary
        List<com.healthcare.entity.Appointment> appointments = appointmentRepo
                .findByPatientIdOrderByAppointmentDateDescStartTimeDesc(patient.getId());
        if (!appointments.isEmpty()) {
            ctx.append("\n=== APPOINTMENT HISTORY (last 5) ===\n");
            appointments.stream().limit(5).forEach(a -> {
                ctx.append("Appt #").append(a.getId()).append(" | Dr. ").append(a.getDoctor().getUser().getName())
                        .append(" (").append(a.getDoctor().getSpecialization()).append(")")
                        .append(" | ").append(a.getAppointmentDate()).append(" | ").append(a.getStatus()).append("\n");
                if (a.getDoctorNotes() != null) {
                    ctx.append("  Doctor Notes: ").append(a.getDoctorNotes()).append("\n");
                }
            });
        }

        return ctx.toString();
    }

    // ─── LLM Calls ────────────────────────────────────────────────────────────

    private ChatResponse callLLMWithHistory(String context, String message,
            List<Map<String, String>> history) throws Exception {
        String systemWithContext = SYSTEM_PROMPT + "\n\n=== PATIENT CONTEXT ===\n" + context;
        if (isGeminiConfigured()) {
            try {
                return callGeminiWithHistory(systemWithContext, message, history);
            } catch (Exception e) {
                log.warn("Gemini API failed, falling back to OpenAI/OpenRouter if configured. Error: {}",
                        e.getMessage());
            }
        }
        if (isOpenAiConfigured()) {
            return callOpenRouterWithHistory(systemWithContext, message, history);
        }
        return fallbackResponse(message);
    }

    private ChatResponse callLLMDirect(String context, String insightPrompt) throws Exception {
        String systemWithContext = SYSTEM_PROMPT + "\n\n=== PATIENT CONTEXT ===\n" + context;
        if (isGeminiConfigured()) {
            try {
                return callGeminiDirect(systemWithContext, insightPrompt);
            } catch (Exception e) {
                log.warn("Gemini API failed, falling back to OpenAI/OpenRouter if configured. Error: {}",
                        e.getMessage());
            }
        }
        if (isOpenAiConfigured()) {
            return callOpenRouterDirect(systemWithContext, insightPrompt);
        }
        return fallbackResponse(insightPrompt);
    }

    private ChatResponse callGeminiWithHistory(String systemPrompt, String message,
            List<Map<String, String>> history) throws Exception {
        RestTemplate restTemplate = new RestTemplate();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        List<Map<String, Object>> contents = new ArrayList<>();

        // System as first user message (Gemini pattern)
        contents.add(Map.of("role", "user",
                "parts", List.of(Map.of("text", systemPrompt))));
        contents.add(Map.of("role", "model",
                "parts", List.of(Map.of("text",
                        "Understood. I will follow these instructions and only answer based on the provided patient context."))));

        // Add conversation history
        for (Map<String, String> turn : history) {
            String geminiRole = "user".equals(turn.get("role")) ? "user" : "model";
            contents.add(Map.of("role", geminiRole,
                    "parts", List.of(Map.of("text", turn.get("content")))));
        }

        // Add current message
        contents.add(Map.of("role", "user",
                "parts", List.of(Map.of("text", message))));

        Map<String, Object> body = Map.of(
                "contents", contents,
                "generationConfig", Map.of(
                        "temperature", 0.2,
                        "maxOutputTokens", 1000,
                        "responseMimeType", "application/json"));

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
        String url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key="
                + geminiApiKey;
        ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);

        return extractGeminiResponse(response.getBody());
    }

    private ChatResponse callGeminiDirect(String systemPrompt, String prompt) throws Exception {
        RestTemplate restTemplate = new RestTemplate();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> body = Map.of(
                "contents", List.of(
                        Map.of("role", "user", "parts", List.of(Map.of("text", systemPrompt))),
                        Map.of("role", "model", "parts", List.of(Map.of("text", "Understood."))),
                        Map.of("role", "user", "parts", List.of(Map.of("text", prompt)))),
                "generationConfig", Map.of(
                        "temperature", 0.2,
                        "maxOutputTokens", 1000,
                        "responseMimeType", "application/json"));

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
        String url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key="
                + geminiApiKey;
        ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);

        return extractGeminiResponse(response.getBody());
    }

    private ChatResponse extractGeminiResponse(String responseBody) {
        try {
            JsonNode root = objectMapper.readTree(responseBody);
            JsonNode parts = root.path("candidates").path(0).path("content").path("parts");
            if (parts.isArray() && parts.size() > 0) {
                String text = parts.get(0).path("text").asText("");
                return parseChatResponse(text);
            }
        } catch (Exception e) {
            log.error("Failed to extract Gemini response: {}", e.getMessage());
        }
        return fallbackResponse("response parsing");
    }

    private ChatResponse callOpenRouterWithHistory(String systemPrompt, String message,
            List<Map<String, String>> history) throws Exception {
        RestTemplate restTemplate = new RestTemplate();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(openAiApiKey);

        List<Map<String, Object>> messages = new ArrayList<>();
        messages.add(Map.of("role", "system", "content", systemPrompt));

        // Add conversation history
        for (Map<String, String> turn : history) {
            messages.add(Map.of("role", turn.get("role"), "content", turn.get("content")));
        }
        messages.add(Map.of("role", "user", "content", message));

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", openAiModel);
        body.put("temperature", 0.2);
        body.put("max_tokens", 1000);
        body.put("messages", messages);
        body.put("response_format", Map.of("type", "json_object"));

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
        ResponseEntity<String> response = restTemplate.postForEntity(openAiBaseUrl, entity, String.class);
        JsonNode root = objectMapper.readTree(response.getBody());
        String text = root.path("choices").get(0).path("message").path("content").asText();
        return parseChatResponse(text);
    }

    private ChatResponse callOpenRouterDirect(String systemPrompt, String prompt) throws Exception {
        RestTemplate restTemplate = new RestTemplate();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(openAiApiKey);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", openAiModel);
        body.put("temperature", 0.2);
        body.put("max_tokens", 1000);
        body.put("messages", List.of(
                Map.of("role", "system", "content", systemPrompt),
                Map.of("role", "user", "content", prompt)));
        body.put("response_format", Map.of("type", "json_object"));

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
        ResponseEntity<String> response = restTemplate.postForEntity(openAiBaseUrl, entity, String.class);
        JsonNode root = objectMapper.readTree(response.getBody());
        String text = root.path("choices").get(0).path("message").path("content").asText();
        return parseChatResponse(text);
    }

    // ─── Response Parsing ──────────────────────────────────────────────────────

    private ChatResponse parseChatResponse(String raw) {
        try {
            if (raw == null || raw.isBlank())
                return fallbackResponse("empty response");

            String text = raw.replaceAll("(?s)```json\\s*", "").replaceAll("```\\s*", "").trim();
            int start = text.indexOf('{');
            int end = text.lastIndexOf('}');
            if (start < 0 || end <= start) {
                log.warn("No JSON object in LLM response, using plain text as reply");
                return ChatResponse.builder()
                        .reply(text.length() > 500 ? text.substring(0, 500) : text)
                        .citations(List.of())
                        .suggestedActions(defaultActions())
                        .confidence("medium")
                        .build();
            }
            text = text.substring(start, end + 1);
            JsonNode root = objectMapper.readTree(text);

            String reply = root.path("reply").asText("").trim();
            if (reply.isBlank()) {
                log.warn("LLM reply field blank");
                return fallbackResponse("blank reply");
            }

            List<ChatResponse.Citation> citations = new ArrayList<>();
            JsonNode cNode = root.path("citations");
            if (cNode.isArray()) {
                cNode.forEach(c -> {
                    long id = c.path("id").asLong(0);
                    if (id > 0) {
                        citations.add(ChatResponse.Citation.builder()
                                .type(c.path("type").asText("record"))
                                .id(id)
                                .snippet(c.path("snippet").asText(""))
                                .build());
                    }
                });
            }

            List<ChatResponse.SuggestedAction> actions = new ArrayList<>();
            JsonNode aNode = root.path("suggestedActions");
            if (aNode.isArray()) {
                aNode.forEach(a -> {
                    String label = a.path("label").asText("").trim();
                    if (!label.isBlank()) {
                        actions.add(ChatResponse.SuggestedAction.builder()
                                .type(a.path("type").asText("appointment"))
                                .label(label)
                                .data(null)
                                .build());
                    }
                });
            }

            return ChatResponse.builder()
                    .reply(reply)
                    .citations(citations)
                    .suggestedActions(actions.isEmpty() ? defaultActions() : actions)
                    .confidence(root.path("confidence").asText("medium"))
                    .build();

        } catch (Exception e) {
            log.warn("Failed to parse LLM response: {}", e.getMessage());
            return fallbackResponse("parse error");
        }
    }

    // ─── Utilities ─────────────────────────────────────────────────────────────

    private String buildSessionKey(Long actingUserId, Long patientId, Long episodeId) {
        return actingUserId + "_" + patientId + (episodeId != null ? "_ep" + episodeId : "_global");
    }

    private List<Map<String, String>> getOrCreateHistory(String sessionId) {
        return conversationHistory.computeIfAbsent(sessionId, k -> new ArrayList<>());
    }

    private void trimHistory(List<Map<String, String>> history) {
        // Keep only last MAX_HISTORY_TURNS * 2 messages (user + assistant pairs)
        int maxMessages = MAX_HISTORY_TURNS * 2;
        while (history.size() > maxMessages) {
            history.remove(0);
        }
    }

    private ChatResponse fallbackResponse(String context) {
        return ChatResponse.builder()
                .reply("I'm having trouble pulling that up right now. Please try again in a moment, or ask your doctor if this is urgent.")
                .citations(List.of())
                .suggestedActions(defaultActions())
                .confidence("low")
                .build();
    }

    private List<ChatResponse.SuggestedAction> defaultActions() {
        return List.of(
                ChatResponse.SuggestedAction.builder().type("contact_doctor").label("Ask your doctor").build(),
                ChatResponse.SuggestedAction.builder().type("appointment").label("Book an appointment").build(),
                ChatResponse.SuggestedAction.builder().type("record").label("Review records").build());
    }

    private boolean isGeminiConfigured() {
        return geminiApiKey != null && !geminiApiKey.isBlank() && geminiApiKey.startsWith("AIza");
    }

    private boolean isOpenAiConfigured() {
        return openAiApiKey != null && !openAiApiKey.isBlank() && openAiApiKey.startsWith("sk-");
    }

    /** Backward-compatible overload */
    public ChatResponse chat(Long patientId, String message, Long episodeId) {
        return chat(patientId, message, episodeId, patientId, "ROLE_PATIENT");
    }
}