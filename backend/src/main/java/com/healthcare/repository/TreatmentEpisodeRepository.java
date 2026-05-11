package com.healthcare.repository;

import com.healthcare.entity.TreatmentEpisode;
import com.healthcare.enums.EpisodeStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TreatmentEpisodeRepository extends JpaRepository<TreatmentEpisode, Long> {

    @Query("SELECT e FROM TreatmentEpisode e WHERE e.patient.id = :patientId ORDER BY e.startDate DESC, e.createdAt DESC")
    List<TreatmentEpisode> findByPatientIdOrderByStartDateDesc(@Param("patientId") Long patientId);

    @Query("SELECT e FROM TreatmentEpisode e WHERE e.doctor.id = :doctorId ORDER BY e.startDate DESC, e.createdAt DESC")
    List<TreatmentEpisode> findByDoctorIdOrderByStartDateDesc(@Param("doctorId") Long doctorId);

    @Query("SELECT e FROM TreatmentEpisode e WHERE e.patient.id = :patientId AND e.status = :status ORDER BY e.startDate DESC")
    List<TreatmentEpisode> findByPatientIdAndStatus(@Param("patientId") Long patientId, @Param("status") EpisodeStatus status);

    Optional<TreatmentEpisode> findByPrimaryAppointmentId(Long appointmentId);

    @Query("SELECT e FROM TreatmentEpisode e WHERE e.patient.id = :patientId AND e.status IN :statuses ORDER BY e.startDate DESC")
    List<TreatmentEpisode> findByPatientIdAndStatusIn(@Param("patientId") Long patientId, @Param("statuses") List<EpisodeStatus> statuses);

    @Query("SELECT e FROM TreatmentEpisode e WHERE e.patient.id = :patientId AND e.startDate <= :date AND (e.endDate IS NULL OR e.endDate >= :date) ORDER BY e.startDate DESC")
    List<TreatmentEpisode> findByPatientIdAndDateWithin(@Param("patientId") Long patientId, @Param("date") java.time.LocalDate date);

    List<TreatmentEpisode> findByStartDateBetween(java.time.LocalDate from, java.time.LocalDate to);
}
