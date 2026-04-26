package com.healthcare.controller;

import com.healthcare.dto.request.SymptomRequest;
import com.healthcare.dto.response.*;
import com.healthcare.service.SymptomService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/symptoms")
@RequiredArgsConstructor
public class SymptomController {

    private final SymptomService symptomService;

    @PostMapping("/suggest")
    public ResponseEntity<ApiResponse<SymptomSuggestionResponse>> suggest(
            @Valid @RequestBody SymptomRequest req) {
        return ResponseEntity.ok(ApiResponse.success(symptomService.getSuggestion(req)));
    }

    /**
     * Debug — visit http://localhost:8081/api/symptoms/models
     * Prints which Gemini models are enabled on your API key to Spring Boot
     * console.
     */
    @GetMapping("/models")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<String>> listModels() {
        String result = symptomService.listAvailableModels();
        return ResponseEntity.ok(ApiResponse.success(result,
                "Check Spring Boot console for full model list"));
    }
}