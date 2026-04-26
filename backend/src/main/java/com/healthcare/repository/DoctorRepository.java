package com.healthcare.repository;

import com.healthcare.entity.Doctor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface DoctorRepository extends JpaRepository<Doctor, Long> {
    Optional<Doctor> findByUserId(Long userId);

    List<Doctor> findBySpecializationContainingIgnoreCase(String specialization);

    List<Doctor> findByIsAvailableTrue();

    @Query("SELECT d FROM Doctor d JOIN FETCH d.user WHERE d.isAvailable = true AND " +
            "(:specialization IS NULL OR LOWER(d.specialization) LIKE LOWER(CONCAT('%', :specialization, '%'))) AND " +
            "(:maxFee IS NULL OR d.consultationFee <= :maxFee) ORDER BY d.rating DESC")
    List<Doctor> searchDoctors(@Param("specialization") String specialization,
            @Param("maxFee") Double maxFee);

    @Query("SELECT DISTINCT d.specialization FROM Doctor d WHERE d.isAvailable = true ORDER BY d.specialization")
    List<String> findAllSpecializations();

    long countByIsAvailableTrue();
}
