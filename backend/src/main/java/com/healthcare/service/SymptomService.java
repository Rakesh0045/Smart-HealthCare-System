package com.healthcare.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.healthcare.dto.request.SymptomRequest;
import com.healthcare.dto.response.DoctorResponse;
import com.healthcare.dto.response.SymptomSuggestionResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class SymptomService {

        private final DoctorService doctorService;
        private final ObjectMapper objectMapper;

        @Value("${app.gemini.api-key:}")
        private String geminiApiKey;

        @Value("${app.openai.api-key:}")
        private String openAiApiKey;

        @Value("${app.openai.model:gpt-4o-mini}")
        private String openAiModel;

        @Value("${app.openai.base-url:https://openrouter.ai/api/v1/chat/completions}")
        private String openAiBaseUrl;

        // ─── Response cache: same symptoms → cached result (saves quota) ─────────
        private final ConcurrentHashMap<String, SymptomSuggestionResponse> responseCache = new ConcurrentHashMap<>();

        // ─── Gemini model priority (highest free quota first) ─────────────────────
        private static final List<String> GEMINI_MODELS = List.of(
                        "gemini-2.0-flash-lite",
                        "gemini-2.0-flash",
                        "gemini-2.5-flash",
                        "gemini-1.5-flash",
                        "gemini-1.5-flash-8b",
                        "gemini-1.5-pro");

        private static final String GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent";

        // ─── Keyword fallback map ─────────────────────────────────────────────────
        private static final Map<List<String>, String> SYMPTOM_MAP = new LinkedHashMap<>() {
                {
                        put(List.of("chest pain", "heart attack", "palpitation", "shortness of breath",
                                        "irregular heartbeat", "chest tightness"), "Cardiology");
                        put(List.of("headache", "migraine", "seizure", "dizziness", "numbness",
                                        "memory loss", "tremor", "stroke", "paralysis"), "Neurology");
                        put(List.of("cough", "cold", "fever", "flu", "sore throat", "fatigue",
                                        "body ache", "weakness", "infection"), "General Medicine");
                        put(List.of("skin rash", "acne", "eczema", "psoriasis", "itching",
                                        "skin allergy", "hair loss", "nail infection"), "Dermatology");
                        put(List.of("bone pain", "joint pain", "fracture", "arthritis",
                                        "back pain", "spine", "muscle pain", "swelling"), "Orthopedics");
                        put(List.of("stomach pain", "vomiting", "diarrhea", "constipation", "bloating",
                                        "acidity", "gastritis", "liver", "jaundice"), "Gastroenterology");
                        put(List.of("eye pain", "blurred vision", "redness in eye", "cataract",
                                        "glaucoma", "eye infection"), "Ophthalmology");
                        put(List.of("ear pain", "hearing loss", "tinnitus", "throat pain",
                                        "nasal congestion", "sinusitis"), "ENT");
                        put(List.of("diabetes", "thyroid", "weight gain", "weight loss",
                                        "hormonal", "metabolism", "insulin"), "Endocrinology");
                        put(List.of("anxiety", "depression", "stress", "insomnia", "panic attack",
                                        "mental health", "bipolar", "schizophrenia"), "Psychiatry");
                        put(List.of("pregnancy", "menstrual", "pcos", "fertility", "gynecology",
                                        "vaginal", "uterus", "ovary"), "Gynecology");
                        put(List.of("kidney", "urinary", "urine infection", "uti", "bladder",
                                        "renal", "prostate"), "Urology");
                        put(List.of("child", "baby", "infant", "pediatric", "vaccination",
                                        "growth", "toddler"), "Pediatrics");
                        put(List.of("cancer", "tumor", "biopsy", "chemotherapy", "oncology"), "Oncology");
                        put(List.of("teeth", "tooth", "dental", "gum", "cavity", "braces"), "Dentistry");
                        put(List.of("lung", "asthma", "breathing", "respiratory",
                                        "pneumonia", "tuberculosis", "bronchitis"), "Pulmonology");
                }
        };

        // Hard-override urgency rules — more reliable than AI for critical symptoms
        private static final Map<String, String> URGENCY_OVERRIDES = Map.of(
                        "Cardiology", "HIGH",
                        "Neurology", "HIGH",
                        "Oncology", "HIGH",
                        "Pulmonology", "HIGH");

        private static final Map<String, String> URGENCY_DEFAULTS = Map.of(
                        "General Medicine", "LOW",
                        "Dermatology", "LOW",
                        "Dentistry", "LOW");

        // ─── Public entry point ───────────────────────────────────────────────────

        public SymptomSuggestionResponse getSuggestion(SymptomRequest request) {
                try {
                        String cacheKey = request.getSymptoms().trim().toLowerCase();

                        // 1. Return cached result if available (no API call needed)
                        if (responseCache.containsKey(cacheKey)) {
                                log.debug("Cache hit for symptoms: {}", cacheKey);
                                return responseCache.get(cacheKey);
                        }

                        // 2. Try Gemini
                        if (isGeminiConfigured()) {
                                try {
                                        SymptomSuggestionResponse result = callGemini(request.getSymptoms());
                                        responseCache.put(cacheKey, result);
                                        return result;
                                } catch (Exception e) {
                                        log.warn("Gemini failed ({}), trying OpenRouter next...", e.getMessage());
                                }
                        }

                        // 3. Try OpenRouter / OpenAI as fallback
                        if (isOpenAiConfigured()) {
                                try {
                                        SymptomSuggestionResponse result = callOpenRouter(request.getSymptoms());
                                        responseCache.put(cacheKey, result);
                                        return result;
                                } catch (Exception e) {
                                        log.warn("OpenRouter also failed ({}), using keyword fallback", e.getMessage());
                                }
                        }

                        // 4. Pure keyword fallback — always works, no API needed
                        log.info("Using keyword fallback for symptoms: {}", cacheKey);
                        return getKeywordSuggestion(request.getSymptoms());
                } catch (Exception e) {
                        log.error("Unexpected symptom analysis error, returning safe fallback", e);
                        return getKeywordSuggestion(request.getSymptoms());
                }
        }

        // ─── Gemini: try each model, skip on 404/429 ─────────────────────────────

        private SymptomSuggestionResponse callGemini(String symptoms) throws Exception {
                RestTemplate restTemplate = new RestTemplate();
                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);

                Map<String, Object> body = Map.of(
                                "contents", List.of(Map.of("parts", List.of(Map.of("text", buildPrompt(symptoms))))),
                                "generationConfig", Map.of(
                                                "temperature", 0.2,
                                                "maxOutputTokens", 300,
                                                "topP", 0.8));
                HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
                Exception lastError = null;

                for (String model : GEMINI_MODELS) {
                        String url = String.format(GEMINI_BASE, model) + "?key=" + geminiApiKey;
                        try {
                                ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);

                                // Parse and validate — throws if JSON is invalid/incomplete
                                SymptomSuggestionResponse result = parseAndValidate(response.getBody(), "gemini",
                                                symptoms);
                                log.info("Gemini succeeded with model: {}", model);
                                return result;

                        } catch (HttpClientErrorException e) {
                                lastError = e;
                                int status = e.getStatusCode().value();
                                if (e.getResponseBodyAsString().contains("API_KEY_INVALID")) {
                                        throw new RuntimeException("Gemini API key is invalid");
                                }
                                if (status == 429 || status == 404) {
                                        log.debug("Model {} returned {} — trying next", model, status);
                                        if (status == 429)
                                                Thread.sleep(80);
                                        continue;
                                }
                                throw e;
                        } catch (IllegalArgumentException e) {
                                // parseAndValidate rejected the response — try next model
                                log.debug("Model {} returned invalid/incomplete JSON — trying next model", model);
                                lastError = e;
                                continue;
                        } catch (Exception e) {
                                // Other errors (network, 500s, etc.) — try next model
                                log.warn("Model {} failed with error: {} — trying next model", model, e.getMessage());
                                lastError = e;
                                continue;
                        }
                }
                throw new RuntimeException("All Gemini models failed", lastError);
        }

        // ─── OpenRouter (your sk-or-v1-... key) ──────────────────────────────────

        private SymptomSuggestionResponse callOpenRouter(String symptoms) throws Exception {
                RestTemplate restTemplate = new RestTemplate();
                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);
                headers.setBearerAuth(openAiApiKey);
                // OpenRouter requires this header
                headers.set("HTTP-Referer", "http://localhost:5173");
                headers.set("X-Title", "Smart Healthcare");

                Map<String, Object> body = new LinkedHashMap<>();
                body.put("model", openAiModel); // e.g. "gpt-4o-mini" or "openai/gpt-4o-mini"
                body.put("temperature", 0.2);
                body.put("max_tokens", 300);
                body.put("messages", List.of(
                                Map.of("role", "system",
                                                "content",
                                                "You are a medical triage assistant. Return ONLY valid JSON. No markdown."),
                                Map.of("role", "user", "content", buildPrompt(symptoms))));
                body.put("response_format", Map.of("type", "json_object"));

                HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
                ResponseEntity<String> response = restTemplate.postForEntity(openAiBaseUrl, entity, String.class);

                JsonNode root = objectMapper.readTree(response.getBody());

                // Check for OpenRouter error field
                if (root.has("error")) {
                        throw new RuntimeException("OpenRouter error: " + root.path("error").path("message").asText());
                }

                JsonNode choices = root.path("choices");
                if (choices.isEmpty())
                        throw new RuntimeException("No choices in OpenRouter response");

                String text = choices.get(0).path("message").path("content").asText("");
                if (text.isBlank())
                        throw new RuntimeException("Empty content from OpenRouter");

                SymptomSuggestionResponse result = parseAndValidate(text, "openrouter", symptoms);
                log.info("OpenRouter succeeded with model: {}", openAiModel);
                return result;
        }

        // ─── Parse + strictly validate AI response ────────────────────────────────
        // Throws IllegalArgumentException if JSON is missing required fields.
        // Caller treats this as a failure and tries the next provider.

        private SymptomSuggestionResponse parseAndValidate(String raw, String source,
                        String originalSymptoms) {
                try {
                        // For Gemini: extract from candidates wrapper
                        String text = raw;
                        if (source.equals("gemini")) {
                                JsonNode root = objectMapper.readTree(raw);
                                JsonNode candidates = root.path("candidates");
                                if (candidates.isEmpty() || candidates.isNull()) {
                                        throw new IllegalArgumentException("No candidates in Gemini response");
                                }
                                text = candidates.get(0)
                                                .path("content").path("parts").get(0)
                                                .path("text").asText("");
                        }

                        // Clean up text — strip fences, find JSON object boundaries
                        text = text.replaceAll("(?s)```json\\s*", "")
                                        .replaceAll("```\\s*", "").trim();
                        int start = text.indexOf('{');
                        int end = text.lastIndexOf('}');
                        if (start < 0 || end <= start) {
                                throw new IllegalArgumentException("No JSON object found in response");
                        }
                        text = text.substring(start, end + 1);

                        JsonNode result = objectMapper.readTree(text);

                        // ── Strict field validation — all required fields must be present ──
                        String specialization = result.path("specialization").asText("");
                        String reasoning = result.path("reasoning").asText("");
                        String urgency = result.path("urgencyLevel").asText("");

                        if (specialization.isBlank() || reasoning.isBlank() || urgency.isBlank()) {
                                throw new IllegalArgumentException(
                                                "AI response missing required fields (specialization/reasoning/urgencyLevel)");
                        }

                        // Validate specialization is a known value
                        List<String> validSpecs = List.of("Cardiology", "Neurology", "General Medicine",
                                        "Dermatology", "Orthopedics", "Gastroenterology", "Ophthalmology", "ENT",
                                        "Endocrinology", "Psychiatry", "Gynecology", "Urology", "Pediatrics",
                                        "Oncology", "Dentistry", "Pulmonology");
                        if (!validSpecs.contains(specialization)) {
                                // Try to fuzzy-match
                                String finalSpec = specialization;
                                specialization = validSpecs.stream()
                                                .filter(v -> v.equalsIgnoreCase(finalSpec))
                                                .findFirst()
                                                .orElseThrow(() -> new IllegalArgumentException(
                                                                "Unknown specialization: " + finalSpec));
                        }

                        // Validate urgency
                        if (!List.of("LOW", "MEDIUM", "HIGH").contains(urgency.toUpperCase())) {
                                urgency = "MEDIUM";
                        }

                        // Hard-override urgency for critical specializations (more reliable than AI)
                        if (URGENCY_OVERRIDES.containsKey(specialization)) {
                                urgency = URGENCY_OVERRIDES.get(specialization);
                        }

                        List<String> conditions = new ArrayList<>();
                        result.path("possibleConditions").forEach(n -> {
                                if (!n.asText().isBlank())
                                        conditions.add(n.asText());
                        });
                        if (conditions.isEmpty())
                                conditions.add("Requires clinical evaluation");

                        List<DoctorResponse> doctors = doctorService.searchDoctors(specialization, null, null);

                        return SymptomSuggestionResponse.builder()
                                        .suggestedSpecialization(specialization)
                                        .reasoning(reasoning)
                                        .possibleConditions(conditions)
                                        .urgencyLevel(urgency.toUpperCase())
                                        .confidenceLevel(normalizeConfidence(
                                                        result.path("confidenceLevel").asText("MEDIUM")))
                                        .providerUsed(source.equals("gemini") ? "Gemini" : "OpenAI")
                                        .immediateActions(extractStringList(result.path("immediateActions"),
                                                        List.of("Book a consultation with a specialist soon",
                                                                        "Monitor symptoms and hydration")))
                                        .redFlags(extractStringList(result.path("redFlags"),
                                                        List.of("Worsening pain", "Persistent breathing difficulty",
                                                                        "High fever not settling")))
                                        .recommendedDoctors(doctors.stream().limit(3).toList())
                                        .aiPowered(true)
                                        .build();

                } catch (IllegalArgumentException e) {
                        throw e; // Re-throw validation failures — triggers provider fallback
                } catch (Exception e) {
                        throw new IllegalArgumentException("Failed to parse AI response: " + e.getMessage(), e);
                }
        }

        // ─── Prompt (shared by Gemini and OpenRouter) ─────────────────────────────

        private String buildPrompt(String symptoms) {
                return String.format(
                                """
                                                You are a medical triage assistant. A patient describes: "%s"

                                                Reply ONLY with a single valid JSON object. No markdown, no code fences, no extra text.
                                                Exactly this structure:
                                                            {
                                                                "specialization":"Cardiology",
                                                                "reasoning":"One sentence explanation.",
                                                                "possibleConditions":["Condition A","Condition B"],
                                                                "urgencyLevel":"HIGH",
                                                                "confidenceLevel":"MEDIUM",
                                                                "immediateActions":["Action 1","Action 2"],
                                                                "redFlags":["Red flag 1","Red flag 2"]
                                                            }

                                                Rules:
                                                - specialization: exactly one of: Cardiology, Neurology, General Medicine, Dermatology, Orthopedics, Gastroenterology, Ophthalmology, ENT, Endocrinology, Psychiatry, Gynecology, Urology, Pediatrics, Oncology, Dentistry, Pulmonology
                                                - urgencyLevel: exactly one of: LOW, MEDIUM, HIGH
                                                            - confidenceLevel: exactly one of: LOW, MEDIUM, HIGH
                                                - possibleConditions: array of 2-3 strings
                                                            - immediateActions: array of 2-3 short practical steps
                                                            - redFlags: array of 2-3 urgent warning signs
                                                - reasoning: exactly one sentence, patient-friendly, no technical jargon
                                                """,
                                symptoms);
        }

        // ─── Keyword fallback — always works, no API ──────────────────────────────

        private SymptomSuggestionResponse getKeywordSuggestion(String symptoms) {
                String lower = symptoms.toLowerCase();
                String matched = "General Medicine";
                int maxMatches = 0;

                for (Map.Entry<List<String>, String> entry : SYMPTOM_MAP.entrySet()) {
                        long count = entry.getKey().stream().filter(lower::contains).count();
                        if (count > maxMatches) {
                                maxMatches = (int) count;
                                matched = entry.getValue();
                        }
                }

                // Apply urgency — hard rules are more reliable than AI for critical cases
                String urgency = URGENCY_OVERRIDES.getOrDefault(matched,
                                URGENCY_DEFAULTS.getOrDefault(matched, "MEDIUM"));

                List<DoctorResponse> doctors = doctorService.searchDoctors(matched, null, null);

                return SymptomSuggestionResponse.builder()
                                .suggestedSpecialization(matched)
                                .reasoning("Based on your symptoms, a " + matched + " specialist is recommended.")
                                .possibleConditions(List.of("Requires clinical evaluation"))
                                .urgencyLevel(urgency)
                                .confidenceLevel("MEDIUM")
                                .providerUsed("Rule-based")
                                .immediateActions(List.of(
                                                "Book an appointment with the recommended specialist",
                                                "Track your symptoms for the next 24 hours"))
                                .redFlags(List.of(
                                                "Sudden worsening of symptoms",
                                                "Trouble breathing or severe chest pain"))
                                .recommendedDoctors(doctors.stream().limit(3).toList())
                                .aiPowered(false)
                                .build();
        }

        // ─── Debug: list which Gemini models work on your API key ────────────────

        public String listAvailableModels() {
                if (!isGeminiConfigured())
                        return "Gemini API key not configured";
                RestTemplate restTemplate = new RestTemplate();
                StringBuilder sb = new StringBuilder("Available Gemini models:\n");
                try {
                        String url = "https://generativelanguage.googleapis.com/v1beta/models?key=" + geminiApiKey;
                        ResponseEntity<String> response = restTemplate.getForEntity(url, String.class);
                        JsonNode root = objectMapper.readTree(response.getBody());
                        root.path("models").forEach(m -> {
                                String name = m.path("name").asText();
                                boolean canGenerate = false;
                                for (JsonNode method : m.path("supportedGenerationMethods")) {
                                        if ("generateContent".equals(method.asText())) {
                                                canGenerate = true;
                                                break;
                                        }
                                }
                                if (canGenerate) {
                                        sb.append("  ✅ ").append(name).append("\n");
                                        log.info("Available model: {}", name);
                                }
                        });
                } catch (Exception e) {
                        sb.append("Error: ").append(e.getMessage());
                        log.error("Could not fetch model list: {}", e.getMessage());
                }
                return sb.toString();
        }

        // ─── Helpers ──────────────────────────────────────────────────────────────

        private boolean isGeminiConfigured() {
                return geminiApiKey != null
                                && !geminiApiKey.isBlank()
                                && !geminiApiKey.equals("your-gemini-api-key-here")
                                && !geminiApiKey.equals("no-key")
                                && geminiApiKey.startsWith("AIza");
        }

        private boolean isOpenAiConfigured() {
                return openAiApiKey != null
                                && !openAiApiKey.isBlank()
                                && !openAiApiKey.equals("your-openai-api-key-here")
                                && (openAiApiKey.startsWith("sk-"));
        }

        private String normalizeConfidence(String confidence) {
                String value = confidence == null ? "MEDIUM" : confidence.trim().toUpperCase();
                return List.of("LOW", "MEDIUM", "HIGH").contains(value) ? value : "MEDIUM";
        }

        private List<String> extractStringList(JsonNode node, List<String> fallback) {
                List<String> values = new ArrayList<>();
                if (node != null && node.isArray()) {
                        node.forEach(item -> {
                                String text = item.asText("").trim();
                                if (!text.isBlank())
                                        values.add(text);
                        });
                }
                return values.isEmpty() ? fallback : values;
        }
}