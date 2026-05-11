package com.healthcare.dto.response;

import com.healthcare.enums.MedicalRecordType;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MedicalRecordResponse {
    private Long id;
    private Long patientId;
    private String patientName;
    private String patientEmail;
    private Long doctorId;
    private String doctorName;
    private String doctorSpecialization;
    private String doctorQualification;
    private String hospitalName;
    private Long appointmentId;
    private MedicalRecordType recordType;
    private String title;
    private String summary;
    private String details;
    private LocalDate recordDate;
    private String attachmentUrl;
    private String recordGroupKey;
    private Integer versionNumber;
    private Long episodeId;
    private String episodeName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
