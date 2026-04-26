package com.healthcare.repository;

import com.healthcare.entity.Rating;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface RatingRepository extends JpaRepository<Rating, Long> {
    Optional<Rating> findByAppointmentId(Long appointmentId);
    List<Rating> findByDoctorIdOrderByCreatedAtDesc(Long doctorId);
    
    @Query("SELECT AVG(r.rating) FROM Rating r WHERE r.doctor.id = :doctorId")
    Double getAverageRatingByDoctor(@Param("doctorId") Long doctorId);
    
    @Query("SELECT COUNT(r) FROM Rating r WHERE r.doctor.id = :doctorId")
    long countByDoctor(@Param("doctorId") Long doctorId);
}
