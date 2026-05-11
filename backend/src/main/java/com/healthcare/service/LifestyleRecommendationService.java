package com.healthcare.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.healthcare.entity.MedicalRecord;
import com.healthcare.entity.TreatmentEpisode;
import com.healthcare.exception.ResourceNotFoundException;
import com.healthcare.repository.MedicalHistoryRepository;
import com.healthcare.repository.MedicalRecordRepository;
import com.healthcare.repository.PrescriptionRepository;
import com.healthcare.repository.TreatmentEpisodeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class LifestyleRecommendationService {

    private final TreatmentEpisodeRepository episodeRepo;
    private final ObjectMapper objectMapper;

    @Value("${app.gemini.api-key:}")
    private String geminiApiKey;

    @Value("${app.openai.api-key:}")
    private String openAiApiKey;

    @Value("${app.openai.model:gpt-4o-mini}")
    private String openAiModel;

    @Value("${app.openai.base-url:https://openrouter.ai/api/v1/chat/completions}")
    private String openAiBaseUrl;

    private final ConcurrentHashMap<String, LifestyleAdvice> adviceCache = new ConcurrentHashMap<>();

    private final MedicalRecordRepository medicalRecordRepo;
    private final PrescriptionRepository prescriptionRepo;
    private final MedicalHistoryRepository medicalHistoryRepo;

    @Transactional
    public LifestyleAdvice generateAdvice(Long episodeId) {
        TreatmentEpisode episode = episodeRepo.findById(episodeId)
                .orElseThrow(() -> new ResourceNotFoundException("TreatmentEpisode", episodeId));

        String cacheKey = episodeId + ":" + (episode.getPrimaryDiagnosis() != null ? episode.getPrimaryDiagnosis() : "");

        if (adviceCache.containsKey(cacheKey)) {
            return adviceCache.get(cacheKey);
        }

        String diagnosis = episode.getPrimaryDiagnosis() != null ? episode.getPrimaryDiagnosis() : "General";
        String medications = extractMedications(episode);
        String medicalHistory = extractMedicalHistory(episode.getPatient().getId());
        String allergies = episode.getPatient().getAllergies() != null ? episode.getPatient().getAllergies() : "None known";
        String recentRecords = extractRecentRecords(episode);

        LifestyleAdvice advice = callAI(diagnosis, medications, medicalHistory, allergies, recentRecords);
        adviceCache.put(cacheKey, advice);
        saveAdviceToEpisode(episode, advice);
        return advice;
    }

    private String extractRecentRecords(TreatmentEpisode episode) {
        List<MedicalRecord> records = medicalRecordRepo.findByEpisodeId(episode.getId());
        if (records.isEmpty()) {
            return "No recent records linked to this episode.";
        }
        StringBuilder sb = new StringBuilder();
        for (MedicalRecord r : records.stream().limit(5).toList()) {
            sb.append("- ").append(r.getRecordType()).append(": ").append(r.getTitle());
            if (r.getSummary() != null) sb.append(" (").append(r.getSummary()).append(")");
            sb.append("\n");
        }
        return sb.toString();
    }

    private LifestyleAdvice callAI(String diagnosis, String medications, String medicalHistory, String allergies, String recentRecords) {
        try {
            if (isGeminiConfigured()) {
                return callGemini(diagnosis, medications, medicalHistory, allergies, recentRecords);
            }
        } catch (Exception e) {
            log.warn("Gemini failed: {}", e.getMessage());
        }

        try {
            if (isOpenAiConfigured()) {
                return callOpenRouter(diagnosis, medications, medicalHistory, allergies, recentRecords);
            }
        } catch (Exception e) {
            log.warn("OpenRouter failed: {}", e.getMessage());
        }

        return getFallbackAdvice(diagnosis);
    }

    private LifestyleAdvice callGemini(String diagnosis, String medications, String medicalHistory, String allergies, String recentRecords) throws Exception {
        RestTemplate restTemplate = new RestTemplate();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> body = Map.of(
                "contents", List.of(Map.of("parts", List.of(Map.of("text", buildPrompt(diagnosis, medications, medicalHistory, allergies, recentRecords))))),
                "generationConfig", Map.of("temperature", 0.3, "maxOutputTokens", 500, "topP", 0.8));

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
        String url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=" + geminiApiKey;
        ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);
        
        JsonNode root = objectMapper.readTree(response.getBody());
        JsonNode parts = root.path("candidates").path(0).path("content").path("parts");
        String text = parts.isArray() && parts.size() > 0 ? parts.get(0).path("text").asText("") : response.getBody();
        return parseAndValidate(text, "gemini");
    }

    private LifestyleAdvice callOpenRouter(String diagnosis, String medications, String medicalHistory, String allergies, String recentRecords) throws Exception {
        RestTemplate restTemplate = new RestTemplate();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(openAiApiKey);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", openAiModel);
        body.put("temperature", 0.3);
        body.put("max_tokens", 500);
        body.put("messages", List.of(
                Map.of("role", "system", "content", "You are a health advisor. Return ONLY valid JSON."),
                Map.of("role", "user", "content", buildPrompt(diagnosis, medications, medicalHistory, allergies, recentRecords))));
        body.put("response_format", Map.of("type", "json_object"));

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
        ResponseEntity<String> response = restTemplate.postForEntity(openAiBaseUrl, entity, String.class);
        JsonNode root = objectMapper.readTree(response.getBody());
        String text = root.path("choices").get(0).path("message").path("content").asText();
        return parseAndValidate(text, "openrouter");
    }

    private LifestyleAdvice parseAndValidate(String raw, String source) {
        try {
            String text = raw == null ? "" : raw.replaceAll("(?s)```json\\s*", "").replaceAll("```\\s*", "").trim();
            int start = text.indexOf('{');
            int end = text.lastIndexOf('}');
            if (start >= 0 && end > start) {
                text = text.substring(start, end + 1);
            } else {
                throw new Exception("No JSON object found in response");
            }
            JsonNode result = objectMapper.readTree(text);

            return LifestyleAdvice.builder()
                    .dietRecommendations(extractStringList(result.path("dietRecommendations")))
                    .exerciseRecommendations(extractStringList(result.path("exerciseRecommendations")))
                    .sleepRecommendations(extractStringList(result.path("sleepRecommendations")))
                    .stressManagement(extractStringList(result.path("stressManagement")))
                    .avoidFoods(extractStringList(result.path("avoidFoods")))
                    .recommendedActivities(extractStringList(result.path("recommendedActivities")))
                    .redFlags(extractStringList(result.path("redFlags")))
                    .followUpFrequency(result.path("followUpFrequency").asText("2 weeks"))
                    .providerUsed(source.equals("gemini") ? "Gemini" : "OpenAI")
                    .aiPowered(true)
                    .build();
        } catch (Exception e) {
            log.warn("Failed to parse LLM response from {}: {}", source, e.getMessage());
            throw new RuntimeException("Parsing failed", e); // Will be caught by callAI which returns getFallbackAdvice
        }
    }

    private String buildPrompt(String diagnosis, String medications, String medicalHistory, String allergies, String recentRecords) {
        return String.format("""
            Patient diagnosis: %s
            Medications: %s
            Medical history: %s
            Allergies: %s
            Recent episode records:
            %s
            
            Provide lifestyle recommendations in JSON format:
            {
                "dietRecommendations": ["tip1", "tip2"],
                "exerciseRecommendations": ["tip1", "tip2"],
                "sleepRecommendations": ["tip1"],
                "stressManagement": ["tip1", "tip2"],
                "avoidFoods": ["food1", "food2"],
                "recommendedActivities": ["activity1"],
                "redFlags": ["symptom1", "symptom2"],
                "followUpFrequency": "2 weeks"
            }
            """, diagnosis, medications, medicalHistory, allergies, recentRecords);
    }

    private LifestyleAdvice getFallbackAdvice(String diagnosis) {
        return LifestyleAdvice.builder()
                .dietRecommendations(List.of("Eat balanced meals with fruits and vegetables", "Stay hydrated"))
                .exerciseRecommendations(List.of("30 minutes of moderate exercise daily", "Include strength training twice a week"))
                .sleepRecommendations(List.of("Aim for 7-8 hours of sleep", "Maintain consistent sleep schedule"))
                .stressManagement(List.of("Practice deep breathing exercises", "Take regular breaks"))
                .avoidFoods(List.of("Processed foods", "Excessive sugar"))
                .recommendedActivities(List.of("Walking", "Yoga"))
                .redFlags(List.of("Severe chest pain", "Difficulty breathing"))
                .followUpFrequency("2 weeks")
                .providerUsed("Rule-based")
                .aiPowered(false)
                .build();
    }

    private String extractMedications(TreatmentEpisode episode) {
        var prescriptions = prescriptionRepo.findByPatientIdOrderByCreatedAtDesc(episode.getPatient().getId());
        if (prescriptions.isEmpty()) {
            return "No prescriptions on record.";
        }
        StringBuilder sb = new StringBuilder();
        for (var p : prescriptions.stream().limit(3).toList()) {
            sb.append("- ").append(p.getMedicines() != null ? p.getMedicines() : "Unnamed medication");
            if (p.getDiagnosis() != null) sb.append(" (for ").append(p.getDiagnosis()).append(")");
            sb.append("\n");
        }
        return sb.toString();
    }

    private String extractMedicalHistory(Long patientId) {
        return medicalHistoryRepo.findByPatientId(patientId)
                .map(h -> {
                    StringBuilder sb = new StringBuilder();
                    if (h.getSummary() != null && !h.getSummary().isBlank()) {
                        sb.append(h.getSummary());
                    }
                    if (h.getAllergiesSummary() != null && !h.getAllergiesSummary().isBlank()) {
                        sb.append(" | Allergies: ").append(h.getAllergiesSummary());
                    }
                    if (h.getConditions() != null && !h.getConditions().isBlank()) {
                        sb.append(" | Conditions: ").append(h.getConditions());
                    }
                    return sb.length() > 0 ? sb.toString() : "No structured medical history on record.";
                })
                .orElse("No medical history on record.");
    }

    private void saveAdviceToEpisode(TreatmentEpisode episode, LifestyleAdvice advice) {
        try {
            episode.setAiLifestyleAdvice(objectMapper.writeValueAsString(advice));
            episode.setAiGeneratedAt(LocalDateTime.now());
            episodeRepo.save(episode);
        } catch (Exception e) {
            log.error("Failed to serialize lifestyle advice", e);
        }
    }

    private boolean isGeminiConfigured() {
        return geminiApiKey != null && !geminiApiKey.isBlank() && geminiApiKey.startsWith("AIza");
    }

    private boolean isOpenAiConfigured() {
        return openAiApiKey != null && !openAiApiKey.isBlank() && openAiApiKey.startsWith("sk-");
    }

    private List<String> extractStringList(JsonNode node) {
        List<String> values = new ArrayList<>();
        if (node != null && node.isArray()) {
            node.forEach(item -> {
                String text = item.asText("").trim();
                if (!text.isBlank()) values.add(text);
            });
        }
        return values.isEmpty() ? List.of("Follow doctor's advice") : values;
    }

    @lombok.Data
    @lombok.Builder
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class LifestyleAdvice {
        private List<String> dietRecommendations;
        private List<String> exerciseRecommendations;
        private List<String> sleepRecommendations;
        private List<String> stressManagement;
        private List<String> avoidFoods;
        private List<String> recommendedActivities;
        private List<String> redFlags;
        private String followUpFrequency;
        private String providerUsed;
        private boolean aiPowered;
    }
}
