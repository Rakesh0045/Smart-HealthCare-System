package com.healthcare.service;

import com.healthcare.dto.request.AppointmentRequest;
import com.healthcare.dto.request.CancelAppointmentRequest;
import com.healthcare.dto.response.AppointmentResponse;
import com.healthcare.entity.*;
import com.healthcare.enums.AppointmentStatus;
import com.healthcare.enums.PaymentStatus;
import com.healthcare.exception.*;
import com.healthcare.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
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
    private final PaymentRepository paymentRepo;
    private final SlotGenerationService slotService;
    private final AppointmentSlipPdfService appointmentSlipPdfService;
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
        byte[] slip = appointmentSlipPdfService.generateSlip(appointment,
                "Appointment Slip", "Please keep this slip for your visit.");
        notificationService.sendAppointmentConfirmation(
                patient.getUser(), doctor.getUser(), details, slip, slip);

        auditLogService.log(userId, "APPOINTMENT_BOOKED", "Appointment",
                appointment.getId(), "Booked with Dr. " + doctor.getUser().getName());

        return mapToResponse(appointment);
    }

    @Transactional
    public AppointmentResponse cancelAppointment(Long appointmentId, Long userId, CancelAppointmentRequest req) {
        Appointment appointment = getAndValidateAppointment(appointmentId);
        validateOwnership(appointment, userId);

        if (appointment.getStatus() == AppointmentStatus.CANCELLED) {
            throw new BadRequestException("Appointment is already cancelled.");
        }
        if (appointment.getStatus() == AppointmentStatus.COMPLETED) {
            throw new BadRequestException("Cannot cancel a completed appointment.");
        }
        if (!appointment.getAppointmentDate().isAfter(LocalDate.now())) {
            throw new BadRequestException(
                    "Appointments can only be cancelled before the appointment date. Same-day absences must be marked as no-show by the doctor.");
        }

        appointment.setStatus(AppointmentStatus.CANCELLED);
        if (req != null) {
            appointment.setCancellationReason(req.getReason() != null ? req.getReason() : req.getReasonText());
        }
        appointment.setCancellationTimestamp(LocalDateTime.now());
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

        boolean isNoShowReschedule = old.getStatus() == AppointmentStatus.NO_SHOW;
        if (old.getStatus() != AppointmentStatus.SCHEDULED
                && old.getStatus() != AppointmentStatus.RESCHEDULED
                && !isNoShowReschedule) {
            throw new BadRequestException("Only scheduled or missed appointments can be rescheduled.");
        }

        // Check reschedule count - allow maximum 1 reschedule
        if (!isNoShowReschedule && old.getRescheduleCount() >= 1) {
            throw new ConflictException(
                    "You can only reschedule an appointment once. Please contact support for further changes.");
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
        old.setIsNoShow(false);
        old.setReason(req.getReason() != null ? req.getReason() : old.getReason());
        old.setRescheduleCount(old.getRescheduleCount() + 1);
        // Preserve payment status for rescheduled appointments
        old = appointmentRepo.save(old);

        byte[] slip = appointmentSlipPdfService.generateSlip(old,
                "Rescheduled Appointment Slip", "Your appointment has been updated.");
        notificationService.sendAppointmentConfirmation(
                old.getPatient().getUser(), old.getDoctor().getUser(),
                buildAppointmentDetails(old, old.getDoctor(), old.getPatient()), slip, slip);

        auditLogService.log(userId, "APPOINTMENT_RESCHEDULED", "Appointment",
                appointmentId, "Rescheduled to " + req.getAppointmentDate());

        return mapToResponse(old);
    }

    @Transactional
    public AppointmentResponse completeAppointment(Long appointmentId, String doctorNotes, Boolean paymentCollected,
            Long userId) {
        Appointment appointment = getAndValidateAppointment(appointmentId);

        if (!appointment.getDoctor().getUser().getId().equals(userId)) {
            throw new BadRequestException("Only the doctor can mark appointment as completed.");
        }
        if (appointment.getStatus() == AppointmentStatus.CANCELLED) {
            throw new BadRequestException("Cannot complete a cancelled appointment.");
        }

        appointment.setStatus(AppointmentStatus.COMPLETED);
        appointment.setDoctorNotes(doctorNotes);
        if (Boolean.TRUE.equals(paymentCollected)) {
            markClinicPaymentAsPaid(appointment);
        }
        appointment = appointmentRepo.save(appointment);

        auditLogService.log(userId, "APPOINTMENT_COMPLETED", "Appointment",
                appointmentId, "Marked completed by Dr. " + appointment.getDoctor().getUser().getName());

        return mapToResponse(appointment);
    }

    private void markClinicPaymentAsPaid(Appointment appointment) {
        if (appointment.getPaymentStatus() == PaymentStatus.PAID) {
            return;
        }

        Payment payment = paymentRepo.findByAppointmentId(appointment.getId())
                .orElseGet(() -> Payment.builder()
                        .appointment(appointment)
                        .amount(appointment.getDoctor().getConsultationFee())
                        .razorpayOrderId("CLINIC-" + appointment.getId())
                        .currency("INR")
                        .build());
        payment.setStatus(PaymentStatus.PAID);
        payment.setAmount(appointment.getDoctor().getConsultationFee());
        if (payment.getRazorpayOrderId() == null || payment.getRazorpayOrderId().isBlank()) {
            payment.setRazorpayOrderId("CLINIC-" + appointment.getId());
        }
        if (payment.getRazorpayPaymentId() == null || payment.getRazorpayPaymentId().isBlank()) {
            payment.setRazorpayPaymentId("CLINIC-PAY-" + appointment.getId());
        }
        if (payment.getRazorpaySignature() == null || payment.getRazorpaySignature().isBlank()) {
            payment.setRazorpaySignature("CLINIC-COLLECTED");
        }
        payment.setCurrency(payment.getCurrency() != null ? payment.getCurrency() : "INR");
        paymentRepo.save(payment);

        appointment.setPaymentStatus(PaymentStatus.PAID);
        byte[] updatedSlip = appointmentSlipPdfService.generateSlip(appointment,
                "Paid Appointment Slip", "Payment has been completed for this visit.");
        notificationService.sendPaymentConfirmation(
                appointment.getPatient().getUser(), appointment.getDoctor().getConsultationFee(), updatedSlip);
    }

    @Transactional
    public AppointmentResponse markAsNoShow(Long appointmentId, Long userId) {
        Appointment appointment = getAndValidateAppointment(appointmentId);

        if (!appointment.getDoctor().getUser().getId().equals(userId)) {
            throw new BadRequestException("Only the doctor can mark appointment as no-show.");
        }
        if (appointment.getStatus() == AppointmentStatus.CANCELLED) {
            throw new BadRequestException("Cannot mark a cancelled appointment as no-show.");
        }
        if (appointment.getStatus() == AppointmentStatus.COMPLETED) {
            throw new BadRequestException("Cannot mark a completed appointment as no-show.");
        }
        if (appointment.getAppointmentDate().isAfter(LocalDate.now())
                || (appointment.getAppointmentDate().equals(LocalDate.now())
                        && LocalTime.now().isBefore(appointment.getStartTime()))) {
            throw new BadRequestException("Can only mark appointments as no-show after their start time.");
        }

        appointment.setStatus(AppointmentStatus.NO_SHOW);
        appointment.setIsNoShow(true);
        appointment = appointmentRepo.save(appointment);

        String details = buildAppointmentDetails(appointment, appointment.getDoctor(), appointment.getPatient());
        // Send no-show notification with rescheduling offer
        notificationService.sendNoShowNotification(
                appointment.getPatient().getUser(),
                details,
                appointment.getDoctor().getUser().getName());

        auditLogService.log(userId, "APPOINTMENT_NO_SHOW", "Appointment",
                appointmentId, "Marked as no-show by Dr. " + appointment.getDoctor().getUser().getName());

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
                .rescheduleCount(a.getRescheduleCount())
                .cancellationReason(a.getCancellationReason())
                .cancellationTimestamp(a.getCancellationTimestamp())
                .isNoShow(a.getIsNoShow())
                .createdAt(a.getCreatedAt())
                .build();
    }
}
