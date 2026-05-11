package com.healthcare.service;

import com.healthcare.dto.request.EpisodeFollowupRequest;
import com.healthcare.dto.request.TreatmentEpisodeRequest;
import com.healthcare.dto.response.EpisodeFollowupResponse;
import com.healthcare.dto.response.MedicalRecordResponse;
import com.healthcare.dto.response.TreatmentEpisodeResponse;
import com.healthcare.entity.*;
import com.healthcare.enums.EpisodeStatus;
import com.healthcare.enums.FollowupType;
import com.healthcare.enums.Role;
import com.healthcare.exception.BadRequestException;
import com.healthcare.exception.ResourceNotFoundException;
import com.healthcare.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TreatmentEpisodeService {

    private final TreatmentEpisodeRepository episodeRepo;
    private final EpisodeFollowupRepository followupRepo;
    private final AppointmentRepository appointmentRepo;
    private final PatientRepository patientRepo;
    private final DoctorRepository doctorRepo;
    private final PrescriptionRepository prescriptionRepo;
    private final MedicalRecordRepository medicalRecordRepo;
    private final UserRepository userRepo;
    private final AuditLogService auditLogService;

    @Transactional
    public TreatmentEpisodeResponse createEpisode(TreatmentEpisodeRequest req, Long doctorUserId) {
        Doctor doctor = doctorRepo.findByUserId(doctorUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Doctor profile not found"));

        Appointment appointment = appointmentRepo.findById(req.getPrimaryAppointmentId())
                .orElseThrow(() -> new ResourceNotFoundException("Appointment", req.getPrimaryAppointmentId()));

        if (!appointment.getDoctor().getId().equals(doctor.getId())) {
            throw new BadRequestException("You can only create episodes for your own appointments.");
        }

        if (episodeRepo.findByPrimaryAppointmentId(req.getPrimaryAppointmentId()).isPresent()) {
            throw new BadRequestException("An episode already exists for this appointment.");
        }

        TreatmentEpisode episode = TreatmentEpisode.builder()
                .patient(appointment.getPatient())
                .doctor(doctor)
                .primaryAppointment(appointment)
                .episodeName(req.getEpisodeName() != null ? req.getEpisodeName() : "Treatment Episode")
                .primaryDiagnosis(req.getPrimaryDiagnosis())
                .conditionCategory(req.getConditionCategory())
                .status(EpisodeStatus.ACTIVE)
                .startDate(req.getStartDate() != null ? req.getStartDate() : appointment.getAppointmentDate())
                .endDate(req.getEndDate())
                .build();

        episode = episodeRepo.save(episode);

        auditLogService.log(doctorUserId, "TREATMENT_EPISODE_CREATED", "TreatmentEpisode", episode.getId(),
                "Created episode for patient " + appointment.getPatient().getUser().getName());

        return mapToResponse(episode);
    }

    @Transactional(readOnly = true)
    public List<TreatmentEpisodeResponse> getMyEpisodes(Long userId, String role) {
        if ("ROLE_DOCTOR".equals(role)) {
            Doctor doctor = doctorRepo.findByUserId(userId)
                    .orElseThrow(() -> new ResourceNotFoundException("Doctor profile not found"));
            return episodeRepo.findByDoctorIdOrderByStartDateDesc(doctor.getId()).stream()
                    .map(this::mapToResponse).collect(Collectors.toList());
        }

        Patient patient = patientRepo.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Patient profile not found"));
        return episodeRepo.findByPatientIdOrderByStartDateDesc(patient.getId()).stream()
                .map(this::mapToResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public TreatmentEpisodeResponse getEpisodeById(Long id, Long userId, String role) {
        TreatmentEpisode episode = episodeRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("TreatmentEpisode", id));

        boolean isPatient = episode.getPatient().getUser().getId().equals(userId);
        boolean isDoctor = episode.getDoctor().getUser().getId().equals(userId);

        if (!isPatient && !isDoctor) {
            throw new BadRequestException("You don't have permission to access this episode.");
        }

        return mapToResponse(episode);
    }

    @Transactional
    public TreatmentEpisodeResponse updateEpisode(Long id, TreatmentEpisodeRequest req, Long userId) {
        TreatmentEpisode episode = episodeRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("TreatmentEpisode", id));

        if (!episode.getDoctor().getUser().getId().equals(userId)) {
            throw new BadRequestException("Only the doctor can update the episode.");
        }

        if (req.getEpisodeName() != null) {
            episode.setEpisodeName(req.getEpisodeName());
        }
        if (req.getPrimaryDiagnosis() != null) {
            episode.setPrimaryDiagnosis(req.getPrimaryDiagnosis());
        }
        if (req.getConditionCategory() != null) {
            episode.setConditionCategory(req.getConditionCategory());
        }
        if (req.getStartDate() != null) {
            episode.setStartDate(req.getStartDate());
        }
        if (req.getEndDate() != null) {
            episode.setEndDate(req.getEndDate());
        }

        episode = episodeRepo.save(episode);

        auditLogService.log(userId, "TREATMENT_EPISODE_UPDATED", "TreatmentEpisode", id,
                "Updated episode for patient " + episode.getPatient().getUser().getName());

        return mapToResponse(episode);
    }

    @Transactional
    public EpisodeFollowupResponse addFollowup(EpisodeFollowupRequest req, Long userId) {
        TreatmentEpisode episode = episodeRepo.findById(req.getEpisodeId())
                .orElseThrow(() -> new ResourceNotFoundException("TreatmentEpisode", req.getEpisodeId()));

        Appointment appointment = appointmentRepo.findById(req.getAppointmentId())
                .orElseThrow(() -> new ResourceNotFoundException("Appointment", req.getAppointmentId()));

        if (!appointment.getPatient().getId().equals(episode.getPatient().getId())) {
            throw new BadRequestException("Appointment must belong to the same patient as the episode.");
        }

        if (!episode.getDoctor().getUser().getId().equals(userId)) {
            throw new BadRequestException("Only the doctor can add follow-ups.");
        }

        EpisodeFollowup followup = EpisodeFollowup.builder()
                .episode(episode)
                .appointment(appointment)
                .followupType(FollowupType.SCHEDULED)
                .followupPurpose(req.getFollowupPurpose())
                .notes(req.getNotes())
                .build();

        followup = followupRepo.save(followup);

        auditLogService.log(userId, "EPISODE_FOLLOWUP_ADDED", "EpisodeFollowup", followup.getId(),
                "Added follow-up to episode " + episode.getId());

        return mapFollowupToResponse(followup);
    }

    @Transactional
    public EpisodeFollowupResponse updateFollowupStatus(Long followupId, FollowupType status, Long userId) {
        EpisodeFollowup followup = followupRepo.findById(followupId)
                .orElseThrow(() -> new ResourceNotFoundException("EpisodeFollowup", followupId));

        if (!followup.getEpisode().getDoctor().getUser().getId().equals(userId)) {
            throw new BadRequestException("Only the doctor can update follow-up status.");
        }

        followup.setFollowupType(status);
        followup = followupRepo.save(followup);

        auditLogService.log(userId, "EPISODE_FOLLOWUP_UPDATED", "EpisodeFollowup", followupId,
                "Updated follow-up status to " + status);

        return mapFollowupToResponse(followup);
    }

    @Transactional
    public TreatmentEpisodeResponse autoCreateEpisodeFromPrescription(Long appointmentId, Long doctorUserId) {
        if (episodeRepo.findByPrimaryAppointmentId(appointmentId).isPresent()) {
            return null;
        }

        Appointment appointment = appointmentRepo.findById(appointmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Appointment", appointmentId));

        // 1. Check if already linked via followup
        List<EpisodeFollowup> followups = followupRepo.findByAppointmentId(appointmentId);
        if (!followups.isEmpty()) {
            return null; // Already linked
        }

        // 2. Intelligently auto-link to an ACTIVE episode with this same doctor
        final Long currentDoctorId = appointment.getDoctor().getId();
        List<TreatmentEpisode> activeEpisodes = episodeRepo.findByPatientIdAndStatus(appointment.getPatient().getId(), EpisodeStatus.ACTIVE)
                .stream().filter(e -> e.getDoctor().getId().equals(currentDoctorId)).toList();
        
        if (!activeEpisodes.isEmpty()) {
            TreatmentEpisode activeEpisode = activeEpisodes.get(0); // Attach to the most recent active episode
            
            // Create the explicit link so it's formally tracked as a follow-up
            EpisodeFollowup autoFollowup = EpisodeFollowup.builder()
                    .episode(activeEpisode)
                    .appointment(appointment)
                    .followupType(FollowupType.COMPLETED)
                    .notes("Auto-linked follow-up appointment from prescription")
                    .build();
            followupRepo.save(autoFollowup);
            
            auditLogService.log(doctorUserId, "TREATMENT_EPISODE_AUTO_LINKED", "TreatmentEpisode", activeEpisode.getId(),
                    "Auto-linked follow-up appointment from prescription for patient " + appointment.getPatient().getUser().getName());
                    
            return mapToResponse(activeEpisode);
        }

        Prescription prescription = prescriptionRepo.findByAppointmentId(appointmentId)
                .orElse(null);

        TreatmentEpisode episode = TreatmentEpisode.builder()
                .patient(appointment.getPatient())
                .doctor(appointment.getDoctor())
                .primaryAppointment(appointment)
                .episodeName("Treatment Episode - " + appointment.getAppointmentDate().format(DateTimeFormatter.ofPattern("MMM yyyy")))
                .primaryDiagnosis(prescription != null ? prescription.getDiagnosis() : "Consultation")
                .conditionCategory("General")
                .status(EpisodeStatus.ACTIVE)
                .startDate(appointment.getAppointmentDate())
                .build();

        episode = episodeRepo.save(episode);

        auditLogService.log(doctorUserId, "TREATMENT_EPISODE_AUTO_CREATED", "TreatmentEpisode", episode.getId(),
                "Auto-created episode from prescription for patient " + appointment.getPatient().getUser().getName());

        return mapToResponse(episode);
    }

    @Transactional
    public MedicalRecordResponse linkRecordToEpisode(Long recordId, Long episodeId, Long actingUserId) {
        User actor = userRepo.findById(actingUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User", actingUserId));

        MedicalRecord record = medicalRecordRepo.findById(recordId)
                .orElseThrow(() -> new ResourceNotFoundException("MedicalRecord", recordId));

        TreatmentEpisode episode = episodeRepo.findById(episodeId)
                .orElseThrow(() -> new ResourceNotFoundException("TreatmentEpisode", episodeId));

        if (actor.getRole() == Role.PATIENT) {
            if (!record.getPatient().getUser().getId().equals(actingUserId)) {
                throw new BadRequestException("You can only link your own records.");
            }
        } else if (actor.getRole() != Role.DOCTOR) {
            throw new BadRequestException("Only doctors or the patient themselves can link records to episodes.");
        }

        if (!record.getPatient().getId().equals(episode.getPatient().getId())) {
            throw new BadRequestException("Record and episode must belong to the same patient.");
        }

        // Idempotency: already linked to the same episode → no-op, return current state
        if (record.getEpisode() != null && record.getEpisode().getId().equals(episodeId)) {
            return mapRecordToResponse(record);
        }

        // Prevent silent re-assignment to a different episode
        if (record.getEpisode() != null) {
            throw new BadRequestException("Record is already linked to episode " + record.getEpisode().getId()
                    + ". Unlink it first before reassigning.");
        }

        record.setEpisode(episode);
        medicalRecordRepo.save(record);

        auditLogService.log(actingUserId, "RECORD_LINKED_TO_EPISODE", "MedicalRecord", recordId,
                "Linked record " + recordId + " to episode " + episodeId);

        return mapRecordToResponse(record);
    }

    @Transactional
    public TreatmentEpisodeResponse transitionEpisodeStatus(Long episodeId, EpisodeStatus newStatus, Long userId) {
        User actor = userRepo.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));
        if (actor.getRole() != Role.DOCTOR) {
            throw new BadRequestException("Only doctors can transition episode status.");
        }

        TreatmentEpisode episode = episodeRepo.findById(episodeId)
                .orElseThrow(() -> new ResourceNotFoundException("TreatmentEpisode", episodeId));

        EpisodeStatus oldStatus = episode.getStatus();
        episode.setStatus(newStatus);

        if (newStatus == EpisodeStatus.RESOLVED && episode.getEndDate() == null) {
            episode.setEndDate(LocalDate.now());
        }

        episode = episodeRepo.save(episode);

        auditLogService.log(userId, "EPISODE_STATUS_TRANSITION", "TreatmentEpisode", episodeId,
                "Status changed from " + oldStatus + " to " + newStatus + " for patient " + episode.getPatient().getUser().getName());

        return mapToResponse(episode);
    }

    @Transactional(readOnly = true)
    public List<MedicalRecordResponse> getLinkedRecords(Long episodeId) {
        return medicalRecordRepo.findByEpisodeId(episodeId).stream()
                .map(this::mapRecordToResponse)
                .collect(Collectors.toList());
    }

    private MedicalRecordResponse mapRecordToResponse(MedicalRecord record) {
        return MedicalRecordResponse.builder()
                .id(record.getId())
                .patientId(record.getPatient().getId())
                .patientName(record.getPatient().getUser().getName())
                .doctorId(record.getDoctor().getId())
                .doctorName(record.getDoctor().getUser().getName())
                .doctorSpecialization(record.getDoctor().getSpecialization())
                .appointmentId(record.getAppointment() != null ? record.getAppointment().getId() : null)
                .episodeId(record.getEpisode() != null ? record.getEpisode().getId() : null)
                .episodeName(record.getEpisode() != null ? record.getEpisode().getEpisodeName() : null)
                .recordType(record.getRecordType())
                .title(record.getTitle())
                .summary(record.getSummary())
                .details(record.getDetails())
                .recordDate(record.getRecordDate())
                .attachmentUrl(record.getAttachmentUrl())
                .recordGroupKey(record.getRecordGroupKey())
                .versionNumber(record.getVersionNumber())
                .createdAt(record.getCreatedAt())
                .updatedAt(record.getUpdatedAt())
                .build();
    }

    private TreatmentEpisodeResponse mapToResponse(TreatmentEpisode episode) {
        List<EpisodeFollowupResponse> followups = followupRepo.findByEpisodeIdOrderByCreatedAtDesc(episode.getId())
                .stream()
                .map(this::mapFollowupToResponse)
                .collect(Collectors.toList());

        return TreatmentEpisodeResponse.builder()
                .id(episode.getId())
                .patientId(episode.getPatient().getId())
                .patientName(episode.getPatient().getUser().getName())
                .doctorId(episode.getDoctor().getId())
                .doctorName(episode.getDoctor().getUser().getName())
                .doctorSpecialization(episode.getDoctor().getSpecialization())
                .primaryAppointmentId(episode.getPrimaryAppointment().getId())
                .episodeName(episode.getEpisodeName())
                .primaryDiagnosis(episode.getPrimaryDiagnosis())
                .conditionCategory(episode.getConditionCategory())
                .status(episode.getStatus())
                .startDate(episode.getStartDate())
                .endDate(episode.getEndDate())
                .aiLifestyleAdvice(episode.getAiLifestyleAdvice())
                .aiGeneratedAt(episode.getAiGeneratedAt())
                .followups(followups)
                .createdAt(episode.getCreatedAt())
                .updatedAt(episode.getUpdatedAt())
                .build();
    }

    private EpisodeFollowupResponse mapFollowupToResponse(EpisodeFollowup followup) {
        DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("dd MMM yyyy");
        DateTimeFormatter timeFormatter = DateTimeFormatter.ofPattern("hh:mm a");

        return EpisodeFollowupResponse.builder()
                .id(followup.getId())
                .episodeId(followup.getEpisode().getId())
                .appointmentId(followup.getAppointment().getId())
                .appointmentDate(followup.getAppointment().getAppointmentDate().format(dateFormatter))
                .appointmentTime(followup.getAppointment().getStartTime().format(timeFormatter))
                .doctorName(followup.getAppointment().getDoctor().getUser().getName())
                .followupType(followup.getFollowupType())
                .followupPurpose(followup.getFollowupPurpose())
                .notes(followup.getNotes())
                .createdAt(followup.getCreatedAt())
                .build();
    }
}
