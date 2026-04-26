package com.healthcare.repository;

import com.healthcare.entity.MedicationDoseLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface MedicationDoseLogRepository extends JpaRepository<MedicationDoseLog, Long> {
    List<MedicationDoseLog> findByPatientIdAndDoseDate(Long patientId, LocalDate doseDate);

    Optional<MedicationDoseLog> findByPatientIdAndPrescriptionMedicineIdAndDoseDateAndSlotIndex(
            Long patientId,
            Long prescriptionMedicineId,
            LocalDate doseDate,
            Integer slotIndex);
}
