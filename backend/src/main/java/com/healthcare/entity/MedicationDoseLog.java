package com.healthcare.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "medication_dose_logs", uniqueConstraints = {
        @UniqueConstraint(name = "uq_dose_log_patient_medicine_date_slot", columnNames = {
                "patient_id", "prescription_medicine_id", "dose_date", "slot_index" })
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MedicationDoseLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "patient_id", nullable = false)
    private Patient patient;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "prescription_medicine_id", nullable = false)
    private PrescriptionMedicine prescriptionMedicine;

    @Column(name = "dose_date", nullable = false)
    private LocalDate doseDate;

    @Column(name = "slot_index", nullable = false)
    private Integer slotIndex;

    @Column(name = "taken", nullable = false)
    @Builder.Default
    private Boolean taken = true;

    @Column(name = "taken_at")
    private LocalDateTime takenAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
