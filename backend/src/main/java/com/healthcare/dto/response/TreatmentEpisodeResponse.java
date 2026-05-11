package com.healthcare.dto.response;

import com.healthcare.enums.EpisodeStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TreatmentEpisodeResponse {
    private Long id;
    private Long patientId;
    private String patientName;
    private Long doctorId;
    private String doctorName;
    private String doctorSpecialization;
    private Long primaryAppointmentId;
    private String episodeName;
    private String primaryDiagnosis;
    private String conditionCategory;
    private EpisodeStatus status;
    private LocalDate startDate;
    private LocalDate endDate;
    private String aiLifestyleAdvice;
    private LocalDateTime aiGeneratedAt;
    private List<EpisodeFollowupResponse> followups;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
