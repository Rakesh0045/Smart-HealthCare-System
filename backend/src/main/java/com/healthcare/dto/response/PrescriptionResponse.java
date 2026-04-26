package com.healthcare.dto.response;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class PrescriptionResponse {
    private Long id;
    private Long appointmentId;
    private String doctorName;
    private String doctorSpecialization;
    private String doctorQualification;
    private String hospitalName;
    private String patientName;
    private String patientEmail;
    private String diagnosis;
    private List<MedicineResponse> medicines;
    private String additionalNotes;
    private LocalDate followUpDate;
    private LocalDateTime createdAt;

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class MedicineResponse {
        private Long id;
        private String medicineName;
        private String dosage;
        private String frequency;
        private String duration;
        private String instructions;
        private String type;
    }
}
