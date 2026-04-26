package com.healthcare.dto.response;

import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MedicationReminderResponse {
    private LocalDate date;
    private int totalSlots;
    private int completedSlots;
    private List<DoseSlotResponse> slots;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class DoseSlotResponse {
        private String slotKey;
        private Long prescriptionId;
        private Long prescriptionMedicineId;
        private String medicineName;
        private String dosage;
        private String frequency;
        private String duration;
        private Integer prescribedDays;
        private Integer dayNumber;
        private LocalDate prescriptionDate;
        private LocalDate prescribedEndDate;
        private String timeLabel;
        private Integer slotIndex;
        private Boolean taken;
        private LocalDateTime takenAt;
    }
}
