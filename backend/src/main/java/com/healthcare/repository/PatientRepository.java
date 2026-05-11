package com.healthcare.repository;

import com.healthcare.entity.Patient;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.EntityGraph;
import java.util.Optional;

@Repository
public interface PatientRepository extends JpaRepository<Patient, Long> {
    Optional<Patient> findByUserId(Long userId);
    boolean existsByUserId(Long userId);

    @EntityGraph(attributePaths = {"user"})
    Optional<Patient> findWithUserById(Long id);
}
