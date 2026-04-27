package com.healthcare.repository;

import com.healthcare.entity.Appointment;
import com.healthcare.enums.AppointmentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Repository
public interface AppointmentRepository extends JpaRepository<Appointment, Long> {
    List<Appointment> findByPatientIdOrderByAppointmentDateDescStartTimeDesc(Long patientId);
    List<Appointment> findByDoctorIdOrderByAppointmentDateAscStartTimeAsc(Long doctorId);
    List<Appointment> findByDoctorIdAndAppointmentDate(Long doctorId, LocalDate date);
    
    @Query("SELECT a FROM Appointment a WHERE a.doctor.id = :doctorId AND " +
           "a.appointmentDate = :date AND a.status NOT IN ('CANCELLED', 'NO_SHOW') AND " +
           "((a.startTime < :endTime AND a.endTime > :startTime))")
    List<Appointment> findConflictingAppointments(@Param("doctorId") Long doctorId,
                                                   @Param("date") LocalDate date,
                                                   @Param("startTime") LocalTime startTime,
                                                   @Param("endTime") LocalTime endTime);
    
    List<Appointment> findByStatusAndReminderSentFalseAndAppointmentDate(
        AppointmentStatus status, LocalDate date);
    
    @Query("SELECT COUNT(a) FROM Appointment a WHERE a.doctor.id = :doctorId AND a.status = 'COMPLETED'")
    long countCompletedByDoctor(@Param("doctorId") Long doctorId);
    
    @Query("SELECT COUNT(a) FROM Appointment a WHERE a.appointmentDate = :date")
    long countByDate(@Param("date") LocalDate date);
    
    @Query("SELECT a.appointmentDate, COUNT(a) FROM Appointment a WHERE " +
           "a.appointmentDate BETWEEN :start AND :end GROUP BY a.appointmentDate ORDER BY a.appointmentDate")
    List<Object[]> countAppointmentsByDateRange(@Param("start") LocalDate start,
                                                @Param("end") LocalDate end);

    @Query("SELECT a FROM Appointment a WHERE a.patient.id = :patientId AND a.doctor.id = :doctorId AND a.status = 'COMPLETED'")
    List<Appointment> findCompletedByPatientAndDoctor(@Param("patientId") Long patientId,
                                                       @Param("doctorId") Long doctorId);
    
    long countByStatus(AppointmentStatus status);
}
