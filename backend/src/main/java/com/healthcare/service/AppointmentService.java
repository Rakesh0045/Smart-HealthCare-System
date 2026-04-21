package com.healthcare.service;

import com.healthcare.dto.request.AppointmentRequest;
import com.healthcare.dto.response.AppointmentResponse;
import com.healthcare.entity.*;
import com.healthcare.enums.AppointmentStatus;
import com.healthcare.exception.*;
import com.healthcare.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class AppointmentService {

    private final AppointmentRepository appointmentRepo;
    private final PatientRepository patientRepo;
    private final DoctorRepository doctorRepo;
    private final PrescriptionRepository prescriptionRepo;
    private final RatingRepository ratingRepo;
    private final SlotGenerationService slotService;
    private final NotificationService notificationService;
    private final AuditLogService auditLogService;

    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a");

    @Transactional
    public AppointmentResponse bookAppointment(AppointmentRequest req, Long userId) {
        Patient patient = patientRepo.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Patient profile not found. Please complete your profile first."));

        Doctor doctor = doctorRepo.findById(req.getDoctorId())
                .orElseThrow(() -> new ResourceNotFoundException("Doctor", req.getDoctorId()));

        if (!Boolean.TRUE.equals(doctor.getIsAvailable())) {
            throw new BadRequestException("Doctor is currently not accepting appointments.");
        }

        // Validate date
        if (req.getAppointmentDate().isBefore(LocalDate.now())) {
            throw new BadRequestException("Cannot book appointments in the past.");
        }

        LocalTime endTime = req.getStartTime().plusMinutes(doctor.getSlotDuration());

        // Validate slot availability (core double-booking prevention)
        if (!slotService.isSlotAvailable(doctor.getId(), req.getAppointmentDate(),
                req.getStartTime(), endTime)) {
            throw new ConflictException(
                    "This time slot is no longer available. Please select a different slot.");
        }

        Appointment appointment = Appointment.builder()
                .patient(patient)
                .doctor(doctor)
                .appointmentDate(req.getAppointmentDate())
                .startTime(req.getStartTime())
                .endTime(endTime)
                .reason(req.getReason())
                .isFirstVisit(req.getIsFirstVisit())
                .status(AppointmentStatus.SCHEDULED)
                .build();

        appointment = appointmentRepo.save(appointment);

        String details = buildAppointmentDetails(appointment, doctor, patient);
        notificationService.sendAppointmentConfirmation(
                patient.getUser(), doctor.getUser(), details);

        auditLogService.log(userId, "APPOINTMENT_BOOKED", "Appointment",
                appointment.getId(), "Booked with Dr. " + doctor.getUser().getName());

        return mapToResponse(appointment);
    }

    @Transactional
    public AppointmentResponse cancelAppointment(Long appointmentId, Long userId) {
        Appointment appointment = getAndValidateAppointment(appointmentId);
        validateOwnership(appointment, userId);

        if (appointment.getStatus() == AppointmentStatus.CANCELLED) {
            throw new BadRequestException("Appointment is already cancelled.");
        }
        if (appointment.getStatus() == AppointmentStatus.COMPLETED) {
            throw new BadRequestException("Cannot cancel a completed appointment.");
        }
        if (appointment.getAppointmentDate().isBefore(LocalDate.now())) {
            throw new BadRequestException("Cannot cancel past appointments.");
        }

        appointment.setStatus(AppointmentStatus.CANCELLED);
        appointment = appointmentRepo.save(appointment);

        User cancelledBy = appointment.getPatient().getUser().getId().equals(userId)
                ? appointment.getPatient().getUser()
                : appointment.getDoctor().getUser();

        notificationService.sendCancellationNotification(
                appointment.getPatient().getUser(),
                appointment.getDoctor().getUser(),
                buildAppointmentDetails(appointment, appointment.getDoctor(), appointment.getPatient()),
                cancelledBy.getName());

        auditLogService.log(userId, "APPOINTMENT_CANCELLED", "Appointment",
                appointmentId, "Cancelled by " + cancelledBy.getName());

        return mapToResponse(appointment);
    }

    @Transactional
    public AppointmentResponse rescheduleAppointment(Long appointmentId,
            AppointmentRequest req, Long userId) {
        Appointment old = getAndValidateAppointment(appointmentId);
        validateOwnership(old, userId);

        if (old.getStatus() != AppointmentStatus.SCHEDULED) {
            throw new BadRequestException("Only scheduled appointments can be rescheduled.");
        }

        Doctor doctor = old.getDoctor();
        LocalTime endTime = req.getStartTime().plusMinutes(doctor.getSlotDuration());

        if (!slotService.isSlotAvailable(doctor.getId(), req.getAppointmentDate(),
                req.getStartTime(), endTime)) {
            throw new ConflictException("Selected slot is not available. Please choose another.");
        }

        old.setAppointmentDate(req.getAppointmentDate());
        old.setStartTime(req.getStartTime());
        old.setEndTime(endTime);
        old.setStatus(AppointmentStatus.RESCHEDULED);
        old.setReason(req.getReason() != null ? req.getReason() : old.getReason());
        old = appointmentRepo.save(old);

        auditLogService.log(userId, "APPOINTMENT_RESCHEDULED", "Appointment",
                appointmentId, "Rescheduled to " + req.getAppointmentDate());

        return mapToResponse(old);
    }

    @Transactional
    public AppointmentResponse completeAppointment(Long appointmentId, String doctorNotes, Long userId) {
        Appointment appointment = getAndValidateAppointment(appointmentId);

        if (!appointment.getDoctor().getUser().getId().equals(userId)) {
            throw new BadRequestException("Only the doctor can mark appointment as completed.");
        }
        if (appointment.getStatus() == AppointmentStatus.CANCELLED) {
            throw new BadRequestException("Cannot complete a cancelled appointment.");
        }

        appointment.setStatus(AppointmentStatus.COMPLETED);
        appointment.setDoctorNotes(doctorNotes);
        appointment = appointmentRepo.save(appointment);

        auditLogService.log(userId, "APPOINTMENT_COMPLETED", "Appointment",
                appointmentId, "Marked completed by Dr. " + appointment.getDoctor().getUser().getName());

        return mapToResponse(appointment);
    }

    @Transactional(readOnly = true)
    public List<AppointmentResponse> getPatientAppointments(Long userId) {
        Patient patient = patientRepo.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Patient profile not found"));
        return appointmentRepo.findByPatientIdOrderByAppointmentDateDescStartTimeDesc(patient.getId())
                .stream().map(this::mapToResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<AppointmentResponse> getDoctorAppointments(Long userId) {
        Doctor doctor = doctorRepo.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Doctor profile not found"));
        return appointmentRepo.findByDoctorIdOrderByAppointmentDateAscStartTimeAsc(doctor.getId())
                .stream().map(this::mapToResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<AppointmentResponse> getDoctorAppointmentsByDate(Long userId, LocalDate date) {
        Doctor doctor = doctorRepo.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Doctor profile not found"));
        return appointmentRepo.findByDoctorIdAndAppointmentDate(doctor.getId(), date)
                .stream().map(this::mapToResponse).toList();
    }

    @Transactional(readOnly = true)
    public AppointmentResponse getAppointmentById(Long id, Long userId) {
        Appointment a = getAndValidateAppointment(id);
        validateOwnership(a, userId);
        return mapToResponse(a);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private Appointment getAndValidateAppointment(Long id) {
        return appointmentRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Appointment", id));
    }

    private void validateOwnership(Appointment a, Long userId) {
        boolean isPatient = a.getPatient().getUser().getId().equals(userId);
        boolean isDoctor = a.getDoctor().getUser().getId().equals(userId);
        if (!isPatient && !isDoctor) {
            throw new BadRequestException("You don't have permission to access this appointment.");
        }
    }

    private String buildAppointmentDetails(Appointment a, Doctor doctor, Patient patient) {
        return String.format(
                "Patient: %s | Doctor: Dr. %s (%s) | Date: %s | Time: %s - %s",
                patient.getUser().getName(),
                doctor.getUser().getName(),
                doctor.getSpecialization(),
                a.getAppointmentDate(),
                a.getStartTime().format(DateTimeFormatter.ofPattern("hh:mm a")),
                a.getEndTime().format(DateTimeFormatter.ofPattern("hh:mm a")));
    }

    public AppointmentResponse mapToResponse(Appointment a) {
        boolean hasPrescription = prescriptionRepo.existsByAppointmentId(a.getId());
        boolean hasRating = ratingRepo.findByAppointmentId(a.getId()).isPresent();

        return AppointmentResponse.builder()
                .id(a.getId())
                .patientId(a.getPatient().getId())
                .patientName(a.getPatient().getUser().getName())
                .patientEmail(a.getPatient().getUser().getEmail())
                .patientPhone(a.getPatient().getUser().getPhone())
                .doctorId(a.getDoctor().getId())
                .doctorName(a.getDoctor().getUser().getName())
                .doctorSpecialization(a.getDoctor().getSpecialization())
                .doctorPhone(a.getDoctor().getUser().getPhone())
                .appointmentDate(a.getAppointmentDate())
                .startTime(a.getStartTime())
                .endTime(a.getEndTime())
                .status(a.getStatus())
                .reason(a.getReason())
                .notes(a.getNotes())
                .doctorNotes(a.getDoctorNotes())
                .paymentStatus(a.getPaymentStatus())
                .consultationFee(a.getDoctor().getConsultationFee())
                .isFirstVisit(a.getIsFirstVisit())
                .hasPrescription(hasPrescription)
                .hasRating(hasRating)
                .createdAt(a.getCreatedAt())
                .build();
    }
}
