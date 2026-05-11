package com.healthcare.service;

import com.healthcare.dto.request.PatientProfileRequest;
import com.healthcare.dto.response.MedicalHistoryResponse;
import com.healthcare.dto.response.PatientResponse;
import com.healthcare.entity.MedicalHistory;
import com.healthcare.entity.Patient;
import com.healthcare.entity.User;
import com.healthcare.exception.ResourceNotFoundException;
import com.healthcare.repository.MedicalHistoryRepository;
import com.healthcare.repository.PatientRepository;
import com.healthcare.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PatientService {

    private final PatientRepository patientRepo;
    private final UserRepository userRepo;
    private final MedicalHistoryRepository medicalHistoryRepo;

    @Transactional
    public PatientResponse createOrUpdateProfile(PatientProfileRequest req, Long userId) {
        User user = userRepo.findById(userId).orElseThrow(() -> new ResourceNotFoundException("User", userId));
        Patient patient = patientRepo.findByUserId(userId).orElse(Patient.builder().user(user).build());
        patient.setDateOfBirth(req.getDateOfBirth());
        patient.setBloodGroup(req.getBloodGroup());
        patient.setAddress(req.getAddress());
        patient.setGender(req.getGender());
        patient.setAllergies(req.getAllergies());
        patient.setEmergencyContact(req.getEmergencyContact());
        patient.setEmergencyContactName(req.getEmergencyContactName());
        return mapToResponse(patientRepo.save(patient));
    }

    @Transactional(readOnly = true)
    public PatientResponse getPatientProfile(Long userId) {
        return patientRepo.findByUserId(userId).map(this::mapToResponse)
                .orElseGet(() -> {
                    User user = userRepo.findById(userId)
                            .orElseThrow(() -> new ResourceNotFoundException("User", userId));
                    return PatientResponse.builder()
                            .userId(user.getId())
                            .name(user.getName())
                            .email(user.getEmail())
                            .phone(user.getPhone())
                            .profileImage(user.getProfileImage())
                            .build();
                });
    }

    @Transactional(readOnly = true)
    public List<PatientResponse> getAllPatients() {
        return patientRepo.findAll().stream().map(this::mapToResponse).toList();
    }

    @Transactional
    public void syncMedicalHistorySummary(Long patientId) {
        Patient patient = patientRepo.findById(patientId)
                .orElseThrow(() -> new ResourceNotFoundException("Patient", patientId));

        MedicalHistory history = medicalHistoryRepo.findByPatientId(patientId)
                .orElse(MedicalHistory.builder().patient(patient).build());

        history.setSummary(patient.getMedicalHistory());
        history.setAllergiesSummary(patient.getAllergies());
        history.setLastSyncedAt(LocalDateTime.now());
        medicalHistoryRepo.save(history);
    }

    @Transactional(readOnly = true)
    public MedicalHistoryResponse getStructuredHistory(Long patientId) {
        return medicalHistoryRepo.findByPatientId(patientId)
                .map(h -> MedicalHistoryResponse.builder()
                        .id(h.getId())
                        .patientId(patientId)
                        .summary(h.getSummary())
                        .conditions(h.getConditions())
                        .medications(h.getMedications())
                        .allergiesSummary(h.getAllergiesSummary())
                        .lastSyncedAt(h.getLastSyncedAt())
                        .createdAt(h.getCreatedAt())
                        .updatedAt(h.getUpdatedAt())
                        .build())
                .orElse(null);
    }

    public PatientResponse mapToResponse(Patient p) {
        return PatientResponse.builder()
                .id(p.getId()).userId(p.getUser().getId())
                .name(p.getUser().getName()).email(p.getUser().getEmail())
                .phone(p.getUser().getPhone()).profileImage(p.getUser().getProfileImage())
                .dateOfBirth(p.getDateOfBirth()).bloodGroup(p.getBloodGroup())
                .address(p.getAddress()).gender(p.getGender())
                .allergies(p.getAllergies()).emergencyContact(p.getEmergencyContact())
                .emergencyContactName(p.getEmergencyContactName()).build();
    }
}
