package com.healthcare.service;

import com.healthcare.entity.Notification;
import com.healthcare.entity.Appointment;
import com.healthcare.entity.User;
import com.healthcare.enums.NotificationType;
import com.healthcare.repository.NotificationRepository;
import com.twilio.Twilio;
import com.twilio.rest.api.v2010.account.Message;
import com.twilio.type.PhoneNumber;
import jakarta.annotation.PostConstruct;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
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
        sendAppointmentConfirmation(patientUser, doctorUser, appointmentDetails, null, null);
    }

    @Async
    public void sendAppointmentConfirmation(User patientUser, User doctorUser,
            String appointmentDetails, byte[] patientSlipPdf, byte[] doctorSlipPdf) {
        // Extract NOW — before session closes
        Long patientId = patientUser.getId();
        String patientEmail = patientUser.getEmail();
        String patientName = patientUser.getName();
        String patientPhone = patientUser.getPhone();
        Long doctorId = doctorUser.getId();
        String doctorEmail = doctorUser.getEmail();
        String doctorName = doctorUser.getName();

        String subject = "Your appointment is confirmed";
        String patientBody = buildHeroEmailHtml("#2563eb", "Appointment Confirmed",
                "Your visit has been scheduled successfully.",
                buildDetailCards(
                        new String[][] {
                                { "Patient", patientName },
                                { "Doctor", "Dr. " + doctorName },
                                { "Appointment", appointmentDetails },
                        }, "Please arrive 10 minutes early and keep this slip handy at the clinic.",
                        "Appointment slip attached for your convenience."));
        String doctorBody = buildHeroEmailHtml("#0f766e", "New Appointment Scheduled",
                "A new patient appointment has been booked.",
                buildDetailCards(
                        new String[][] {
                                { "Patient", patientName },
                                { "Appointment", appointmentDetails },
                        }, "Please review the appointment details and prepare accordingly.",
                        "Appointment slip attached."));

        createNotificationById(patientId, "Appointment Confirmed",
                "Your appointment is confirmed. " + appointmentDetails,
                NotificationType.APPOINTMENT_BOOKED, null);
        createNotificationById(doctorId, "New Appointment",
                "New appointment: " + appointmentDetails,
                NotificationType.APPOINTMENT_BOOKED, null);

        sendEmail(patientEmail, patientName, subject, patientBody, patientSlipPdf, "appointment-slip.pdf");
        sendEmail(doctorEmail, doctorName, subject, doctorBody, doctorSlipPdf, "appointment-slip.pdf");

        if (patientPhone != null && !patientPhone.isBlank()) {
            sendSms(patientPhone, "Appt confirmed: " + appointmentDetails);
        }
    }

    @Async
    public void sendCancellationNotification(User patientUser, User doctorUser,
            String appointmentDetails, String cancelledBy) {
        Long patientId = patientUser.getId();
        String patientEmail = patientUser.getEmail();
        String patientName = patientUser.getName();
        Long doctorId = doctorUser.getId();
        String doctorEmail = doctorUser.getEmail();
        String doctorName = doctorUser.getName();

        String subject = "Appointment cancelled";
        String msg = buildHeroEmailHtml("#e11d48", "Appointment Cancelled",
                "Your appointment has been cancelled.",
                buildDetailCards(
                        new String[][] {
                                { "Cancelled By", cancelledBy },
                                { "Details", appointmentDetails },
                        }, "You can reschedule at a time that suits you.",
                        "If this cancellation is unexpected, please contact the clinic."));

        createNotificationById(patientId, "Appointment Cancelled", msg,
                NotificationType.APPOINTMENT_CANCELLED, null);
        createNotificationById(doctorId, "Appointment Cancelled", msg,
                NotificationType.APPOINTMENT_CANCELLED, null);

        sendEmail(patientEmail, patientName, subject, msg, null, null);
        sendEmail(doctorEmail, doctorName, subject, msg, null, null);
    }

    @Async
    public void sendAppointmentReminder(User patientUser, String appointmentDetails) {
        Long userId = patientUser.getId();
        String email = patientUser.getEmail();
        String name = patientUser.getName();
        String phone = patientUser.getPhone();

        String subject = "Appointment reminder";
        String msg = buildHeroEmailHtml("#d97706", "Appointment Reminder",
                "Your appointment is coming up soon.",
                buildDetailCards(
                        new String[][] { { "Appointment", appointmentDetails } },
                        "Please be on time and carry any previous reports or prescriptions.",
                        "We look forward to seeing you."));

        createNotificationById(userId, "Appointment Tomorrow!", msg,
                NotificationType.APPOINTMENT_REMINDER, null);
        sendEmail(email, name, subject, msg, null, null);

        if (phone != null && !phone.isBlank()) {
            sendSms(phone, "Reminder: Appt tomorrow - " + appointmentDetails);
        }
    }

    @Async
    public void sendPrescriptionNotification(User patientUser, String doctorName) {
        sendPrescriptionNotification(patientUser, doctorName, null);
    }

    @Async
    public void sendPrescriptionNotification(User patientUser, String doctorName, byte[] prescriptionPdf) {
        Long userId = patientUser.getId();
        String email = patientUser.getEmail();
        String name = patientUser.getName();

        // Fix "Dr. Dr." bug — only prepend if not already there
        String displayName = doctorName.startsWith("Dr. ") ? doctorName : "Dr. " + doctorName;

        String subject = "Your prescription is ready";
        String msg = buildHeroEmailHtml("#0f766e", "Prescription Added",
                "A new prescription has been issued after your consultation.",
                buildDetailCards(
                        new String[][] { { "Doctor", displayName } },
                        "You can download the PDF from your account anytime.",
                        "Thank you for trusting MediCare with your care."));

        createNotificationById(userId, "New Prescription Added", msg,
                NotificationType.PRESCRIPTION_ADDED, null);
        sendEmail(email, name, subject, msg, prescriptionPdf, "prescription.pdf");
    }

    @Async
    public void sendPaymentConfirmation(User patientUser, Double amount) {
        sendPaymentConfirmation(patientUser, amount, null);
    }

    @Async
    public void sendPaymentConfirmation(User patientUser, Double amount, byte[] updatedAppointmentSlipPdf) {
        // Extract ALL values immediately — this is the method that was throwing NPE
        Long userId = patientUser.getId();
        String email = patientUser.getEmail();
        String name = patientUser.getName();

        String subject = "Payment received";
        String msg = buildHeroEmailHtml("#16a34a", "Payment Completed",
                String.format("We have received your payment of ₹%.2f successfully.", amount),
                buildDetailCards(
                        new String[][] { { "Amount", String.format("₹%.2f", amount) } },
                        "Your appointment slip has been updated with paid status.",
                        "Thank you for paying on time."));

        createNotificationById(userId, "Payment Confirmed", msg,
                NotificationType.PAYMENT_SUCCESS, null);
        sendEmail(email, name, subject, msg, updatedAppointmentSlipPdf, "appointment-slip-paid.pdf");
    }

    @Async
    public void sendNoShowNotification(User patientUser, String appointmentDetails, String doctorName) {
        Long userId = patientUser.getId();
        String email = patientUser.getEmail();
        String name = patientUser.getName();
        String phone = patientUser.getPhone();

        String subject = "Missed appointment - please reschedule";
        String msg = buildHeroEmailHtml("#7c3aed", "No-show recorded",
                "We noticed you missed your appointment with Dr. " + doctorName + ".",
                buildDetailCards(
                        new String[][] { { "Appointment", appointmentDetails } },
                        "Please reschedule at your convenience so your care plan stays on track.",
                        "We are here whenever you are ready to continue."));

        createNotificationById(userId, "Missed Appointment - Reschedule Available", msg,
                NotificationType.APPOINTMENT_CANCELLED, null);
        sendEmail(email, name, subject, msg, null, null);

        if (phone != null && !phone.isBlank()) {
            sendSms(phone, "You missed your appointment. Login to reschedule with Dr. " + doctorName);
        }
    }

    @Async
    public void sendVerificationOtp(User user, String otp) {
        String subject = "Verify your email address";
        String body = buildHeroEmailHtml("#2563eb", "Confirm your email",
                "Use the one-time code below to activate your account.",
                buildOtpCard(otp, "This code expires in 15 minutes.",
                        "If you did not create this account, you can ignore this email."));
        sendEmail(user.getEmail(), user.getName(), subject, body, null, null);
    }

    @Async
    public void sendVerificationSuccessEmail(User user) {
        String subject = "Email verified successfully";
        String body = buildHeroEmailHtml("#16a34a", "Welcome to MediCare",
                "Your email has been verified and your account is now active.",
                buildDetailCards(
                        new String[][] { { "Role", String.valueOf(user.getRole()) }, { "Email", user.getEmail() } },
                        "You can now log in and continue with booking appointments.",
                        "We are glad to have you on the platform."));
        sendEmail(user.getEmail(), user.getName(), subject, body, null, null);
    }

    @Async
    public void sendDoctorUnavailableNotification(List<Appointment> appointments, String doctorName) {
        if (appointments == null || appointments.isEmpty())
            return;
        for (Appointment appointment : appointments) {
            User patient = appointment.getPatient().getUser();
            String subject = "Your appointment needs rescheduling";
            String body = buildHeroEmailHtml("#d97706", "Doctor unavailable",
                    "Dr. " + doctorName + " is unavailable for the selected day.",
                    buildDetailCards(
                            new String[][] {
                                    { "Appointment",
                                            appointment.getAppointmentDate() + " " + appointment.getStartTime() },
                                    { "Doctor", "Dr. " + doctorName },
                            },
                            "Please reschedule at a time that is convenient for you.",
                            "We are sorry for the inconvenience."));
            sendEmail(patient.getEmail(), patient.getName(), subject, body, null, null);
        }
    }

    @Async
    public void sendFollowUpReminder(User patientUser, String doctorName, String followUpDate) {
        String subject = "Follow-up reminder";
        String body = buildHeroEmailHtml("#d97706", "Follow-up approaching",
                "Your follow-up with Dr. " + doctorName + " is approaching.",
                buildDetailCards(
                        new String[][] { { "Follow-up Date", followUpDate } },
                        "Please book or confirm your follow-up if needed.",
                        "Keeping follow-ups timely helps your recovery stay on track."));
        sendEmail(patientUser.getEmail(), patientUser.getName(), subject, body, null, null);
    }

    // ─── Email & SMS dispatch ─────────────────────────────────────────────────

    private void sendEmail(String to, String name, String subject, String body, byte[] attachment,
            String attachmentName) {
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
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, attachment != null,
                    StandardCharsets.UTF_8.name());
            helper.setFrom(fromEmail);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(body, true);
            if (attachment != null) {
                helper.addAttachment(attachmentName != null ? attachmentName : "attachment.pdf",
                        new ByteArrayResource(attachment));
            }
            mailSender.send(mimeMessage);
            log.info("Email sent to {}", to);
        } catch (MessagingException e) {
            log.error("Failed to send email to {}: {}", to, e.getMessage());
        } catch (Exception e) {
            log.error("Failed to send email to {}: {}", to, e.getMessage());
        }
    }

    private String buildHeroEmailHtml(String accent, String heading, String intro, String innerHtml) {
        return "<!doctype html><html><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">"
                + "</head><body style=\"margin:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a\">"
                + "<table role=\"presentation\" width=\"100%\" cellspacing=\"0\" cellpadding=\"0\" style=\"background:#f8fafc;padding:24px 12px\"><tr><td align=\"center\">"
                + "<table role=\"presentation\" width=\"100%\" style=\"max-width:640px;background:#fff;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden;box-shadow:0 18px 50px rgba(15,23,42,.08)\">"
                + "<tr><td style=\"padding:0\"><div style=\"height:8px;background:" + accent + "\"></div></td></tr>"
                + "<tr><td style=\"padding:28px 28px 16px\">"
                + "<div style=\"display:inline-block;padding:6px 12px;border-radius:999px;background:" + accent
                + "12;color:" + accent
                + ";font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase\">MediCare</div>"
                + "<h1 style=\"margin:16px 0 8px;font-size:26px;line-height:1.2;color:#0f172a\">" + heading + "</h1>"
                + "<p style=\"margin:0 0 18px;font-size:15px;line-height:1.7;color:#475569\">" + intro + "</p>"
                + innerHtml
                + "</td></tr>"
                + "<tr><td style=\"padding:0 28px 24px\"><div style=\"margin-top:18px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:12px;line-height:1.6;color:#64748b\">"
                + "Smart Healthcare Management System<br/>Please do not reply to this email.</div></td></tr>"
                + "</table></td></tr></table></body></html>";
    }

    private String buildDetailCards(String[][] details, String footer, String closing) {
        StringBuilder out = new StringBuilder();
        out.append(
                "<div style=\"display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin:18px 0\">");
        for (String[] detail : details) {
            out.append(
                    "<div style=\"background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:14px 16px\">")
                    .append("<div style=\"font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px\">")
                    .append(detail[0]).append("</div>")
                    .append("<div style=\"font-size:15px;font-weight:700;color:#0f172a;line-height:1.5\">")
                    .append(detail[1]).append("</div></div>");
        }
        out.append("</div>")
                .append("<div style=\"margin-top:6px;padding:14px 16px;border-radius:14px;background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;font-size:14px;line-height:1.6\">")
                .append(footer)
                .append("</div>")
                .append("<p style=\"margin:16px 0 0;font-size:13px;line-height:1.7;color:#64748b\">")
                .append(closing)
                .append("</p>");
        return out.toString();
    }

    private String buildOtpCard(String otp, String note, String footer) {
        return "<div style=\"margin:18px 0;padding:20px;border-radius:18px;background:linear-gradient(135deg,#eff6ff,#ffffff);border:1px solid #bfdbfe;text-align:center\">"
                + "<div style=\"font-size:12px;font-weight:700;color:#1d4ed8;text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px\">Your verification code</div>"
                + "<div style=\"font-family:Arial,Helvetica,sans-serif;letter-spacing:.24em;font-weight:800;font-size:30px;color:#0f172a;background:#fff;border:1px dashed #93c5fd;border-radius:14px;padding:14px 18px;display:inline-block\">"
                + otp + "</div>"
                + "<div style=\"margin-top:12px;font-size:13px;line-height:1.7;color:#475569\">" + note + "</div>"
                + "<div style=\"margin-top:10px;font-size:13px;line-height:1.7;color:#64748b\">" + footer + "</div>"
                + "</div>";
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
                    message).create();
            log.info("SMS sent to {}", phone);
        } catch (Exception e) {
            log.error("Failed to send SMS to {}: {}", phone, e.getMessage());
        }
    }
}
