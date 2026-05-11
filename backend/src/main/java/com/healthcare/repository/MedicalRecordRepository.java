package com.healthcare.repository;

import com.healthcare.entity.MedicalRecord;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MedicalRecordRepository extends JpaRepository<MedicalRecord, Long> {

    @EntityGraph(attributePaths = {"patient", "patient.user", "doctor", "doctor.user", "appointment"})
    @Query("select r from MedicalRecord r where r.patient.id = :patientId order by r.recordDate desc, r.versionNumber desc, r.createdAt desc")
    List<MedicalRecord> findPatientTimeline(@Param("patientId") Long patientId);

    @EntityGraph(attributePaths = {"patient", "patient.user", "doctor", "doctor.user", "appointment"})
    @Query("select r from MedicalRecord r where r.doctor.id = :doctorId order by r.recordDate desc, r.versionNumber desc, r.createdAt desc")
    List<MedicalRecord> findDoctorTimeline(@Param("doctorId") Long doctorId);

    @EntityGraph(attributePaths = {"patient", "patient.user", "doctor", "doctor.user", "appointment"})
    @Query("select r from MedicalRecord r where r.patient.id = :patientId and r.doctor.id = :doctorId order by r.recordDate desc, r.versionNumber desc, r.createdAt desc")
    List<MedicalRecord> findPatientTimelineForDoctor(@Param("patientId") Long patientId, @Param("doctorId") Long doctorId);

    @EntityGraph(attributePaths = {"patient", "patient.user", "doctor", "doctor.user", "appointment", "episode"})
    @Query("select r from MedicalRecord r where r.episode.id = :episodeId order by r.recordDate desc, r.createdAt desc")
    List<MedicalRecord> findByEpisodeId(@Param("episodeId") Long episodeId);

    List<MedicalRecord> findAllByRecordGroupKey(String recordGroupKey);

    @Query("select r from MedicalRecord r where r.patient.id = :patientId order by r.recordDate desc, r.createdAt desc")
    List<MedicalRecord> findTop5ByPatientIdOrderByRecordDateDesc(@Param("patientId") Long patientId);
}
