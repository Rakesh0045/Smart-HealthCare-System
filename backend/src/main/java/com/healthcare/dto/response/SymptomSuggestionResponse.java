package com.healthcare.dto.response;

import lombok.*;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SymptomSuggestionResponse {
    private String suggestedSpecialization;
    private String reasoning;
    private List<String> possibleConditions;
    private String urgencyLevel;
    private String confidenceLevel;
    private String providerUsed;
    private List<String> immediateActions;
    private List<String> redFlags;
    private List<DoctorResponse> recommendedDoctors;
    private boolean aiPowered;
}
