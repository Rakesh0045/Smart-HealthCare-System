package com.healthcare.service;

import com.healthcare.dto.request.MedicalRecordRequest;
import com.healthcare.dto.response.MedicalRecordResponse;
import com.healthcare.entity.*;
import com.healthcare.enums.MedicalRecordType;
import com.healthcare.exception.BadRequestException;
import com.healthcare.exception.ResourceNotFoundException;
import com.healthcare.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MedicalRecordService {

    private final MedicalRecordRepository medicalRecordRepo;
    private final AppointmentRepository appointmentRepo;
    private final PatientRepository patientRepo;
    private final DoctorRepository doctorRepo;
    private final UserRepository userRepo;
    private final AuditLogService auditLogService;
    private final TreatmentEpisodeRepository episodeRepo;

    @Transactional
    public MedicalRecordResponse createRecord(MedicalRecordRequest req, Long doctorUserId) {
        return createRecordWithOptionalEpisode(req, doctorUserId, req.getEpisodeId());
    }

    @Transactional
    public MedicalRecordResponse createRecordWithOptionalEpisode(MedicalRecordRequest req, Long doctorUserId, Long explicitEpisodeId) {
        Doctor doctor = doctorRepo.findByUserId(doctorUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Doctor profile not found"));
        Patient patient = patientRepo.findById(req.getPatientId())
                .orElseThrow(() -> new ResourceNotFoundException("Patient", req.getPatientId()));

        Appointment appointment = null;
        if (req.getAppointmentId() != null) {
            appointment = appointmentRepo.findById(req.getAppointmentId())
                    .orElseThrow(() -> new ResourceNotFoundException("Appointment", req.getAppointmentId()));
            if (!appointment.getDoctor().getId().equals(doctor.getId()) || !appointment.getPatient().getId().equals(patient.getId())) {
                throw new BadRequestException("Selected appointment does not belong to this doctor and patient.");
            }
        }

        String groupKey = UUID.randomUUID().toString();
        int versionNumber = req.getVersionNumber() != null ? req.getVersionNumber() : 1;
        if (req.getSourceRecordId() != null) {
            MedicalRecord source = medicalRecordRepo.findById(req.getSourceRecordId())
                    .orElseThrow(() -> new ResourceNotFoundException("MedicalRecord", req.getSourceRecordId()));
            if (!source.getPatient().getId().equals(patient.getId())) {
                throw new BadRequestException("Source record must belong to the selected patient.");
            }
            groupKey = source.getRecordGroupKey();
            versionNumber = source.getVersionNumber() + 1;
        }

        TreatmentEpisode episode = null;
        if (explicitEpisodeId != null) {
            episode = episodeRepo.findById(explicitEpisodeId)
                    .orElseThrow(() -> new ResourceNotFoundException("TreatmentEpisode", explicitEpisodeId));
            if (!episode.getPatient().getId().equals(patient.getId())) {
                throw new BadRequestException("Episode does not belong to the selected patient.");
            }
        }

        MedicalRecord saved = medicalRecordRepo.save(MedicalRecord.builder()
                .patient(patient)
                .doctor(doctor)
                .appointment(appointment)
                .episode(episode)
                .recordType(req.getRecordType())
                .title(req.getTitle().trim())
                .summary(req.getSummary())
                .details(req.getDetails())
                .recordDate(req.getRecordDate() != null ? req.getRecordDate() : LocalDate.now())
                .attachmentUrl(req.getAttachmentUrl())
                .recordGroupKey(groupKey)
                .versionNumber(versionNumber)
                .build());

        if (episode == null) {
            autoLinkRecord(saved);
        }

        auditLogService.log(doctorUserId, "MEDICAL_RECORD_ADDED", "MedicalRecord", saved.getId(),
                "Added " + saved.getRecordType() + " for patient " + patient.getUser().getName());
        return mapToResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<MedicalRecordResponse> getMyRecords(Long userId, String role) {
        if ("ROLE_DOCTOR".equals(role)) {
            Doctor doctor = doctorRepo.findByUserId(userId)
                    .orElseThrow(() -> new ResourceNotFoundException("Doctor profile not found"));
            return medicalRecordRepo.findDoctorTimeline(doctor.getId()).stream().map(this::mapToResponse).toList();
        }

        Patient patient = patientRepo.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Patient profile not found"));
        return medicalRecordRepo.findPatientTimeline(patient.getId()).stream().map(this::mapToResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<MedicalRecordResponse> getPatientTimeline(Long viewerUserId, String role, Long patientId) {
        if ("ROLE_PATIENT".equals(role)) {
            Patient current = patientRepo.findByUserId(viewerUserId)
                    .orElseThrow(() -> new ResourceNotFoundException("Patient profile not found"));
            if (!current.getId().equals(patientId)) {
                throw new BadRequestException("You can only view your own medical records.");
            }
            return medicalRecordRepo.findPatientTimeline(patientId).stream().map(this::mapToResponse).toList();
        }

        Doctor doctor = doctorRepo.findByUserId(viewerUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Doctor profile not found"));
        if (appointmentRepo.findCompletedByPatientAndDoctor(patientId, doctor.getId()).isEmpty()) {
            throw new BadRequestException("You can only view records for patients you have treated.");
        }
        return medicalRecordRepo.findPatientTimelineForDoctor(patientId, doctor.getId()).stream().map(this::mapToResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<MedicalRecordResponse> getRecordsByEpisode(Long episodeId) {
        return medicalRecordRepo.findByEpisodeId(episodeId).stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Transactional
    public MedicalRecordResponse autoLinkRecord(MedicalRecord record) {
        if (record.getEpisode() != null) {
            return mapToResponse(record);
        }

        // If record group key exists, check if any record in same group has an episode link
        List<MedicalRecord> groupRecords = medicalRecordRepo.findAllByRecordGroupKey(record.getRecordGroupKey());
        for (MedicalRecord gr : groupRecords) {
            if (gr.getEpisode() != null && !gr.getId().equals(record.getId())) {
                record.setEpisode(gr.getEpisode());
                medicalRecordRepo.save(record);
                return mapToResponse(record);
            }
        }

        // Heuristic: find episode starting within 30 days of record date for same patient
        LocalDate recordDate = record.getRecordDate();
        List<TreatmentEpisode> episodes = episodeRepo.findByPatientIdAndDateWithin(
                record.getPatient().getId(), recordDate);
        if (!episodes.isEmpty()) {
            record.setEpisode(episodes.get(0));
            medicalRecordRepo.save(record);
            return mapToResponse(record);
        }

        return mapToResponse(record);
    }

    @Transactional
    public MedicalRecordResponse linkRecordToEpisode(Long recordId, Long episodeId, Long actingUserId) {
        // Implemented in TreatmentEpisodeService to keep transaction boundaries clean
        throw new UnsupportedOperationException("Use TreatmentEpisodeService.linkRecordToEpisode");
    }

    private MedicalRecordResponse mapToResponse(MedicalRecord record) {
        User patientUser = record.getPatient().getUser();
        User doctorUser = record.getDoctor().getUser();
        return MedicalRecordResponse.builder()
                .id(record.getId())
                .patientId(record.getPatient().getId())
                .patientName(patientUser != null ? patientUser.getName() : null)
                .patientEmail(patientUser != null ? patientUser.getEmail() : null)
                .doctorId(record.getDoctor().getId())
                .doctorName(doctorUser != null ? doctorUser.getName() : null)
                .doctorSpecialization(record.getDoctor().getSpecialization())
                .doctorQualification(record.getDoctor().getQualification())
                .hospitalName(record.getDoctor().getHospital())
                .appointmentId(record.getAppointment() != null ? record.getAppointment().getId() : null)
                .recordType(record.getRecordType())
                .title(record.getTitle())
                .summary(record.getSummary())
                .details(record.getDetails())
                .recordDate(record.getRecordDate())
                .attachmentUrl(record.getAttachmentUrl())
                .recordGroupKey(record.getRecordGroupKey())
                .versionNumber(record.getVersionNumber())
                .episodeId(record.getEpisode() != null ? record.getEpisode().getId() : null)
                .episodeName(record.getEpisode() != null ? record.getEpisode().getEpisodeName() : null)
                .createdAt(record.getCreatedAt())
                .updatedAt(record.getUpdatedAt())
                .build();
    }
}
