package com.healthcare.dto.response;

import lombok.*;

import java.time.LocalDateTime;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class MedicalHistoryResponse {
    private Long id;
    private Long patientId;
    private String summary;
    private String conditions;
    private String medications;
    private String allergiesSummary;
    private LocalDateTime lastSyncedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
