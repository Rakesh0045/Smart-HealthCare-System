package com.healthcare.dto.request;

import jakarta.validation.constraints.*;
import lombok.Data;
import java.time.LocalDate;
import java.util.List;

@Data
public class PrescriptionRequest {
    @NotNull
    private Long appointmentId;
    @NotBlank
    private String diagnosis;
    private List<MedicineRequest> medicines;
    private String additionalNotes;
    private LocalDate followUpDate;

    @Data
    public static class MedicineRequest {
        @NotBlank
        private String medicineName;
        private String dosage;
        private String frequency;
        private String duration;
        private String instructions;
        private String type;
    }
}
