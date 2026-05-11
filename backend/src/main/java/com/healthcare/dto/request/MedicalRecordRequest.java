package com.healthcare.dto.request;

import com.healthcare.enums.MedicalRecordType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.time.LocalDate;

@Data
public class MedicalRecordRequest {
    @NotNull
    private Long patientId;

    private Long appointmentId;

    private Long sourceRecordId;
    private Long episodeId;

    @NotNull
    private MedicalRecordType recordType;

    @NotBlank
    private String title;

    private String summary;
    private String details;
    private LocalDate recordDate;
    private String attachmentUrl;

    @Positive
    private Integer versionNumber;
}
