package com.healthcare.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TreatmentEpisodeRequest {
    @NotNull
    private Long primaryAppointmentId;

    private String episodeName;

    private String primaryDiagnosis;

    private String conditionCategory;

    private LocalDate startDate;

    private LocalDate endDate;
}
