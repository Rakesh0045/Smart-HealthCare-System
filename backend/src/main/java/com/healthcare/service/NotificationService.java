package com.healthcare.service;

import com.healthcare.entity.Notification;
import com.healthcare.entity.User;
import com.healthcare.enums.NotificationType;
import com.healthcare.repository.NotificationRepository;
import com.twilio.Twilio;
import com.twilio.rest.api.v2010.account.Message;
import com.twilio.type.PhoneNumber;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final JavaMailSender mailSender;

    @Value("${app.notification.mode:dev}")
    private String notificationMode;

    @Value("${spring.mail.username}")
    private String fromEmail;

    @Value("${app.twilio.account-sid}")
    private String twilioAccountSid;

    @Value("${app.twilio.auth-token}")
    private String twilioAuthToken;

    @Value("${app.twilio.from-number}")
    private String twilioFromNumber;

    @PostConstruct
    public void initTwilio() {
        if ("prod".equalsIgnoreCase(notificationMode)) {
            try {
                Twilio.init(twilioAccountSid, twilioAuthToken);
                log.info("Twilio initialized in PROD mode");
            } catch (Exception e) {
                log.warn("Twilio init failed: {}", e.getMessage());
            }
        }
    }

    // ─── In-App Notification ──────────────────────────────────────────────────

    @Transactional
    public void createNotification(User user, String title, String message,
                                    NotificationType type, Long referenceId) {
        Notification n = Notification.builder()
                .user(user).title(title).message(message)
                .type(type).referenceId(referenceId).isRead(false)
                .build();
        notificationRepository.save(n);
    }

    /**
     * Saves a notification using only the userId — avoids Hibernate proxy access
     * in @Async threads where the original session is already closed.
     */
    @Transactional
    public void createNotificationById(Long userId, String title, String message,
                                        NotificationType type, Long referenceId) {
        User ref = User.builder().id(userId).build();
        Notification n = Notification.builder()
                .user(ref).title(title).message(message)
                .type(type).referenceId(referenceId).isRead(false)
                .build();
        notificationRepository.save(n);
    }

    public List<Notification> getUserNotifications(Long userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public long getUnreadCount(Long userId) {
        return notificationRepository.countByUserIdAndIsReadFalse(userId);
    }

    @Transactional
    public void markAllAsRead(Long userId) {
        notificationRepository.markAllAsRead(userId);
    }

    @Transactional
    public void markAsRead(Long notificationId, Long userId) {
        notificationRepository.findById(notificationId).ifPresent(n -> {
            if (n.getUser().getId().equals(userId)) {
                n.setIsRead(true);
                notificationRepository.save(n);
            }
        });
    }

    // ─── Appointment Confirmation ─────────────────────────────────────────────
    //
    // IMPORTANT: All @Async methods must extract primitive values (String, Long)
    // from JPA entities BEFORE the method returns. Hibernate session closes after
    // the calling transaction ends, so lazy proxies will throw NullPointerException
    // when accessed in the async thread. Never pass raw JPA entities to @Async.

    @Async
    public void sendAppointmentConfirmation(User patientUser, User doctorUser,
                                             String appointmentDetails) {
        // Extract NOW — before session closes
        Long   patientId    = patientUser.getId();
        String patientEmail = patientUser.getEmail();
        String patientName  = patientUser.getName();
        String patientPhone = patientUser.getPhone();
        Long   doctorId     = doctorUser.getId();
        String doctorEmail  = doctorUser.getEmail();
        String doctorName   = doctorUser.getName();

        String subject    = "✅ Appointment Confirmed - Smart Healthcare";
        String patientMsg = "Your appointment has been confirmed!\n\n" + appointmentDetails
                + "\n\nPlease arrive 10 minutes early. Stay healthy!";
        String doctorMsg  = "New appointment scheduled:\n\n" + appointmentDetails;

        createNotificationById(patientId, "Appointment Confirmed",
                "Your appointment is confirmed. " + appointmentDetails,
                NotificationType.APPOINTMENT_BOOKED, null);
        createNotificationById(doctorId, "New Appointment",
                "New appointment: " + appointmentDetails,
                NotificationType.APPOINTMENT_BOOKED, null);

        sendEmail(patientEmail, patientName, subject, patientMsg);
        sendEmail(doctorEmail,  doctorName,  subject, doctorMsg);

        if (patientPhone != null && !patientPhone.isBlank()) {
            sendSms(patientPhone, "Appt confirmed: " + appointmentDetails);
        }
    }

    @Async
    public void sendCancellationNotification(User patientUser, User doctorUser,
                                              String appointmentDetails, String cancelledBy) {
        Long   patientId    = patientUser.getId();
        String patientEmail = patientUser.getEmail();
        String patientName  = patientUser.getName();
        Long   doctorId     = doctorUser.getId();
        String doctorEmail  = doctorUser.getEmail();
        String doctorName   = doctorUser.getName();

        String subject = "❌ Appointment Cancelled - Smart Healthcare";
        String msg = "Appointment cancelled by " + cancelledBy + ":\n\n" + appointmentDetails;

        createNotificationById(patientId, "Appointment Cancelled", msg,
                NotificationType.APPOINTMENT_CANCELLED, null);
        createNotificationById(doctorId, "Appointment Cancelled", msg,
                NotificationType.APPOINTMENT_CANCELLED, null);

        sendEmail(patientEmail, patientName, subject, msg);
        sendEmail(doctorEmail,  doctorName,  subject, msg);
    }

    @Async
    public void sendAppointmentReminder(User patientUser, String appointmentDetails) {
        Long   userId = patientUser.getId();
        String email  = patientUser.getEmail();
        String name   = patientUser.getName();
        String phone  = patientUser.getPhone();

        String subject = "🔔 Appointment Reminder - Smart Healthcare";
        String msg = "Reminder: Your appointment is tomorrow!\n\n" + appointmentDetails
                + "\n\nPlease be on time!";

        createNotificationById(userId, "Appointment Tomorrow!", msg,
                NotificationType.APPOINTMENT_REMINDER, null);
        sendEmail(email, name, subject, msg);

        if (phone != null && !phone.isBlank()) {
            sendSms(phone, "Reminder: Appt tomorrow - " + appointmentDetails);
        }
    }

    @Async
    public void sendPrescriptionNotification(User patientUser, String doctorName) {
        Long   userId = patientUser.getId();
        String email  = patientUser.getEmail();
        String name   = patientUser.getName();

        // Fix "Dr. Dr." bug — only prepend if not already there
        String displayName = doctorName.startsWith("Dr. ") ? doctorName : "Dr. " + doctorName;

        String subject = "💊 New Prescription - Smart Healthcare";
        String msg = displayName + " has added a new prescription for you. "
                + "Login to view and download it.";

        createNotificationById(userId, "New Prescription Added", msg,
                NotificationType.PRESCRIPTION_ADDED, null);
        sendEmail(email, name, subject, msg);
    }

    @Async
    public void sendPaymentConfirmation(User patientUser, Double amount) {
        // Extract ALL values immediately — this is the method that was throwing NPE
        Long   userId = patientUser.getId();
        String email  = patientUser.getEmail();
        String name   = patientUser.getName();

        String subject = "💳 Payment Confirmed - Smart Healthcare";
        String msg = String.format("Payment of ₹%.2f received successfully. "
                + "Your appointment is confirmed.", amount);

        createNotificationById(userId, "Payment Confirmed", msg,
                NotificationType.PAYMENT_SUCCESS, null);
        sendEmail(email, name, subject, msg);
    }

    // ─── Email & SMS dispatch ─────────────────────────────────────────────────

    private void sendEmail(String to, String name, String subject, String body) {
        if ("dev".equalsIgnoreCase(notificationMode)) {
            log.info("╔══════ [EMAIL MOCK - DEV MODE] ══════╗");
            log.info("║ TO      : {}", to);
            log.info("║ NAME    : {}", name);
            log.info("║ SUBJECT : {}", subject);
            log.info("║ BODY    : {}", body);
            log.info("╚═════════════════════════════════════╝");
            return;
        }
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(to);
            message.setSubject(subject);
            message.setText("Dear " + name + ",\n\n" + body
                    + "\n\n---\nSmart Healthcare Management System\nDo not reply to this email.");
            mailSender.send(message);
            log.info("Email sent to {}", to);
        } catch (Exception e) {
            log.error("Failed to send email to {}: {}", to, e.getMessage());
        }
    }

    private void sendSms(String phone, String message) {
        if ("dev".equalsIgnoreCase(notificationMode)) {
            log.info("╔══════ [SMS MOCK - DEV MODE] ═════╗");
            log.info("║ TO  : {}", phone);
            log.info("║ MSG : {}", message);
            log.info("╚═══════════════════════════════════╝");
            return;
        }
        try {
            Message.creator(
                    new PhoneNumber("+91" + phone),
                    new PhoneNumber(twilioFromNumber),
                    message
            ).create();
            log.info("SMS sent to {}", phone);
        } catch (Exception e) {
            log.error("Failed to send SMS to {}: {}", phone, e.getMessage());
        }
    }
}
