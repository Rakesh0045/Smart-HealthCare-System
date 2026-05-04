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
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

        private static final String ICON_CHECK = "&#9989;";
        private static final String ICON_CROSS = "&#10060;";
        private static final String ICON_PATIENT = "&#128100;";
        private static final String ICON_DOCTOR = "&#129658;";
        private static final String ICON_DATE = "&#128197;";
        private static final String ICON_TIME = "&#9200;";
        private static final String ICON_INFO = "&#8505;";
        private static final String ICON_CLIPBOARD = "&#128203;";
        private static final String ICON_REFRESH = "&#128260;";
        private static final String ICON_PIN = "&#128204;";
        private static final String ICON_PILL = "&#128138;";
        private static final String ICON_ATTACHMENT = "&#128206;";
        private static final String ICON_PAYMENT = "&#128179;";
        private static final String ICON_WARNING = "&#9888;";
        private static final String ICON_LOCK = "&#128272;";
        private static final String ICON_PARTY = "&#127881;";
        private static final String ICON_EMAIL = "&#9993;";
        private static final String ICON_TAG = "&#127991;";
        private static final String ICON_ROCKET = "&#128640;";

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

        // In-App Notifications

        @Transactional
        public void createNotification(User user, String title, String message,
                        NotificationType type, Long referenceId) {
                Notification n = Notification.builder()
                                .user(user).title(title).message(message)
                                .type(type).referenceId(referenceId).isRead(false)
                                .build();
                notificationRepository.save(n);
        }

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

        // Appointment Confirmation

        @Async
        public void sendAppointmentConfirmation(User patientUser, User doctorUser,
                        String appointmentDetails) {
                sendAppointmentConfirmation(patientUser, doctorUser, appointmentDetails, null, null);
        }

        @Async
        public void sendAppointmentConfirmation(User patientUser, User doctorUser,
                        String appointmentDetails, byte[] patientSlipPdf, byte[] doctorSlipPdf) {

                Long patientId = patientUser.getId();
                String patientEmail = patientUser.getEmail();
                String patientName = patientUser.getName();
                String patientPhone = patientUser.getPhone();
                Long doctorId = doctorUser.getId();
                String doctorEmail = doctorUser.getEmail();
                String doctorName = doctorUser.getName();

                String subject = "Appointment Confirmed - MediCare";

                AppointmentEmailDetails details = parseAppointmentDetails(appointmentDetails);
                String docPart = !details.doctor().isBlank() ? details.doctor() : "Dr. " + doctorName;
                String datePart = details.date();
                String timePart = details.time();
                String schedulePart = joinDateTime(datePart, timePart);

                String patientBody = buildEmail(EmailConfig.builder()
                                .theme("blue")
                                .icon(ICON_CHECK)
                                .badge("Booking Confirmed")
                                .heading("Your appointment is confirmed!")
                                .subheading("Hi " + firstName(patientName)
                                                + ", we've successfully scheduled your visit. Here are your details:")
                                .rows(new String[][] {
                                                { ICON_PATIENT, "Patient", patientName },
                                                { ICON_DOCTOR, "Doctor", docPart },
                                                { ICON_DATE, "Date", datePart },
                                                { ICON_TIME, "Time", timePart },
                                })
                                .alertIcon(ICON_ATTACHMENT)
                                .alertText("Please arrive 10 minutes early and carry any previous medical reports.")
                                .footerNote("Your appointment slip is attached to this email.")
                                .build());

                String doctorBody = buildEmail(EmailConfig.builder()
                                .theme("teal")
                                .icon(ICON_DATE)
                                .badge("New Appointment")
                                .heading("New appointment scheduled")
                                .subheading("A patient has booked a consultation with you. Please review the details below.")
                                .rows(new String[][] {
                                                { ICON_PATIENT, "Patient", patientName },
                                                { ICON_DATE, "Date", datePart },
                                                { ICON_TIME, "Time", timePart },
                                })
                                .alertIcon(ICON_ATTACHMENT)
                                .alertText("Please prepare your schedule and review any prior patient records.")
                                .footerNote("The appointment slip is attached for your reference.")
                                .build());

                createNotificationById(patientId, "Appointment Confirmed",
                                "Your appointment is confirmed. " + appointmentDetails,
                                NotificationType.APPOINTMENT_BOOKED, null);
                createNotificationById(doctorId, "New Appointment",
                                "New appointment: " + appointmentDetails,
                                NotificationType.APPOINTMENT_BOOKED, null);

                sendEmail(patientEmail, patientName, subject, patientBody, patientSlipPdf, "appointment-slip.pdf");
                sendEmail(doctorEmail, doctorName, subject, doctorBody, doctorSlipPdf, "appointment-slip.pdf");

                if (patientPhone != null && !patientPhone.isBlank()) {
                        sendSms(patientPhone, buildSms("Appointment Confirmed",
                                        new String[][] {
                                                        { "Doctor", docPart },
                                                        { "Date", details.date() },
                                                        { "Time", details.time() },
                                        },
                                        "Arrive 10 mins early. Login to MediCare for your slip."));
                }
        }

        @Async
        public void sendAppointmentRescheduled(User patientUser, User doctorUser,
                        String appointmentDetails, byte[] patientSlipPdf, byte[] doctorSlipPdf) {

                Long patientId = patientUser.getId();
                String patientEmail = patientUser.getEmail();
                String patientName = patientUser.getName();
                String patientPhone = patientUser.getPhone();
                Long doctorId = doctorUser.getId();
                String doctorEmail = doctorUser.getEmail();
                String doctorName = doctorUser.getName();

                String subject = "Appointment Rescheduled - MediCare";

                AppointmentEmailDetails details = parseAppointmentDetails(appointmentDetails);
                String docPart = !details.doctor().isBlank() ? details.doctor() : "Dr. " + doctorName;
                String datePart = details.date();
                String timePart = details.time();
                String schedulePart = joinDateTime(datePart, timePart);

                String patientBody = buildEmail(EmailConfig.builder()
                                .theme("amber")
                                .icon(ICON_REFRESH)
                                .badge("Appointment Rescheduled")
                                .heading("Your appointment has been rescheduled")
                                .subheading("Hi " + firstName(patientName)
                                                + ", your visit has been moved to the updated slot below.")
                                .rows(new String[][] {
                                                { ICON_PATIENT, "Patient", patientName },
                                                { ICON_DOCTOR, "Doctor", docPart },
                                                { ICON_DATE, "New Date", datePart },
                                                { ICON_TIME, "New Time", timePart },
                                })
                                .alertIcon(ICON_ATTACHMENT)
                                .alertText("Please follow the new appointment date and time. Your updated slip is attached.")
                                .footerNote("If this new slot does not work for you, please reschedule from your patient portal.")
                                .build());

                String doctorBody = buildEmail(EmailConfig.builder()
                                .theme("amber")
                                .icon(ICON_REFRESH)
                                .badge("Appointment Rescheduled")
                                .heading("Appointment slot updated")
                                .subheading("A patient appointment has been rescheduled. Please use the new timing below.")
                                .rows(new String[][] {
                                                { ICON_PATIENT, "Patient", patientName },
                                                { ICON_DATE, "New Date", datePart },
                                                { ICON_TIME, "New Time", timePart },
                                })
                                .alertIcon(ICON_ATTACHMENT)
                                .alertText("Please update your schedule and review the attached rescheduled appointment slip.")
                                .footerNote("The updated appointment slip is attached for your reference.")
                                .build());

                createNotificationById(patientId, "Appointment Rescheduled",
                                "Your appointment has been rescheduled. " + appointmentDetails,
                                NotificationType.APPOINTMENT_BOOKED, null);
                createNotificationById(doctorId, "Appointment Rescheduled",
                                "Appointment rescheduled: " + appointmentDetails,
                                NotificationType.APPOINTMENT_BOOKED, null);

                sendEmail(patientEmail, patientName, subject, patientBody, patientSlipPdf,
                                "rescheduled-appointment-slip.pdf");
                sendEmail(doctorEmail, doctorName, subject, doctorBody, doctorSlipPdf,
                                "rescheduled-appointment-slip.pdf");

                if (patientPhone != null && !patientPhone.isBlank()) {
                        sendSms(patientPhone, buildSms("Appointment Rescheduled",
                                        new String[][] {
                                                        { "Doctor", docPart },
                                                        { "Date", datePart },
                                                        { "Time", timePart },
                                        },
                                        "Please follow the updated appointment time. Login to MediCare for your slip."));
                }
        }

        private AppointmentEmailDetails parseAppointmentDetails(String appointmentDetails) {
                if (appointmentDetails == null || appointmentDetails.isBlank()) {
                        return new AppointmentEmailDetails("", "", "");
                }

                String[] parts = appointmentDetails.split("\\|");
                Map<String, String> fields = new HashMap<>();
                for (String part : parts) {
                        String trimmed = part.trim();
                        int colon = trimmed.indexOf(':');
                        if (colon > 0) {
                                fields.put(trimmed.substring(0, colon).trim().toLowerCase(),
                                                trimmed.substring(colon + 1).trim());
                        }
                }

                String doctor = fields.getOrDefault("doctor", "");
                String date = fields.getOrDefault("date", "");
                String time = fields.getOrDefault("time", "");

                if (fields.isEmpty()) {
                        doctor = parts.length > 0 ? parts[0].trim() : "";
                        String schedule = parts.length > 1 ? parts[1].trim() : "";
                        int atIndex = schedule.toLowerCase().indexOf(" at ");
                        if (atIndex >= 0) {
                                date = schedule.substring(0, atIndex).trim();
                                time = schedule.substring(atIndex + 4).trim();
                        } else {
                                date = schedule;
                        }
                }

                return new AppointmentEmailDetails(doctor, formatDisplayDate(date), time);
        }

        private String joinDateTime(String date, String time) {
                if (date == null || date.isBlank())
                        return time != null ? time : "";
                if (time == null || time.isBlank())
                        return date;
                return date + " at " + time;
        }

        private String formatTimeRange(String startTime, String endTime) {
                String start = formatDisplayTime(startTime);
                String end = formatDisplayTime(endTime);
                if (start.isBlank())
                        return end;
                if (end.isBlank())
                        return start;
                return start + " - " + end;
        }

        private String formatDisplayTime(String time) {
                if (time == null || time.isBlank())
                        return "";
                try {
                        if (time.length() >= 5) {
                                int hour = Integer.parseInt(time.substring(0, 2));
                                int minute = Integer.parseInt(time.substring(3, 5));
                                String suffix = hour >= 12 ? "PM" : "AM";
                                int displayHour = hour % 12;
                                if (displayHour == 0)
                                        displayHour = 12;
                                return String.format(Locale.ENGLISH, "%d:%02d %s", displayHour, minute, suffix);
                        }
                } catch (Exception ignored) {
                }
                return time;
        }

        private String formatDisplayDate(String date) {
                if (date == null || date.isBlank())
                        return "";
                try {
                        LocalDate parsed = LocalDate.parse(date.trim());
                        int day = parsed.getDayOfMonth();
                        return day + ordinalSuffix(day) + " "
                                        + parsed.format(DateTimeFormatter.ofPattern("MMMM yyyy", Locale.ENGLISH));
                } catch (DateTimeParseException ignored) {
                        return date;
                }
        }

        private String ordinalSuffix(int day) {
                if (day >= 11 && day <= 13)
                        return "th";
                return switch (day % 10) {
                        case 1 -> "st";
                        case 2 -> "nd";
                        case 3 -> "rd";
                        default -> "th";
                };
        }

        private record AppointmentEmailDetails(String doctor, String date, String time) {
        }

        private String formatCancellationReason(String reason) {
                return switch (reason) {
                        case "PERSONAL" -> "Personal / Schedule Conflict";
                        case "MEDICAL" -> "Medical Emergency";
                        case "DOCTOR_UNAVAILABLE" -> "Doctor Unavailable";
                        case "SCHEDULING_CONFLICT" -> "Scheduling Conflict";
                        default -> reason;
                };
        }

        @Async
        public void sendCancellationNotification(User patientUser, User doctorUser,
                        String appointmentDetails, String cancelledBy, String cancellationReason) {

                Long patientId = patientUser.getId();
                String patientEmail = patientUser.getEmail();
                String patientName = patientUser.getName();
                Long doctorId = doctorUser.getId();
                String doctorEmail = doctorUser.getEmail();
                String doctorName = doctorUser.getName();

                String patientSubject = "Appointment Cancelled - MediCare";
                String doctorSubject = "Patient Cancelled Appointment - MediCare";
                AppointmentEmailDetails details = parseAppointmentDetails(appointmentDetails);
                String datePart = joinDateTime(details.date(), details.time());
                String reason = (cancellationReason != null && !cancellationReason.isBlank())
                                ? formatCancellationReason(cancellationReason)
                                : "No reason provided";

                String patientBody = buildEmail(EmailConfig.builder()
                                .theme("red")
                                .icon(ICON_CROSS)
                                .badge("Appointment Cancelled")
                                .heading("Your appointment has been cancelled")
                                .subheading("We're sorry for the inconvenience. Here are the details of the cancelled visit:")
                                .rows(new String[][] {
                                                { ICON_PATIENT, "Patient", patientName },
                                                { ICON_DOCTOR, "Doctor", "Dr. " + doctorName },
                                                { ICON_DATE, "Date", details.date() },
                                                { ICON_TIME, "Time", details.time() },
                                                { ICON_PATIENT, "Cancelled By", cancelledBy },
                                })
                                .alertIcon(ICON_REFRESH)
                                .alertText("You can reschedule anytime through your patient portal. We apologise for any disruption.")
                                .footerNote("If this cancellation was unexpected, please contact the clinic directly.")
                                .build());

                String doctorBody = buildEmail(EmailConfig.builder()
                                .theme("red")
                                .icon(ICON_INFO)
                                .badge("Patient Cancelled")
                                .heading("A patient appointment was cancelled")
                                .subheading("Hi Dr. " + firstName(doctorName)
                                                + ", this appointment is no longer on your schedule.")
                                .rows(new String[][] {
                                                { ICON_PATIENT, "Patient", patientName },
                                                { ICON_DATE, "Date", details.date() },
                                                { ICON_TIME, "Time", details.time() },
                                                { ICON_PATIENT, "Cancelled By", cancelledBy },
                                                { ICON_INFO, "Reason", reason },
                                })
                                .alertIcon(ICON_REFRESH)
                                .alertText("You do not need to prepare for this visit. The slot may now be made available for other appointments.")
                                .footerNote("This cancellation update is for your clinic schedule records.")
                                .build());

                createNotificationById(patientId, "Appointment Cancelled",
                                "Your appointment has been cancelled. " + appointmentDetails,
                                NotificationType.APPOINTMENT_CANCELLED, null);
                createNotificationById(doctorId, "Appointment Cancelled",
                                "Appointment cancelled. " + appointmentDetails + ". Reason: " + reason,
                                NotificationType.APPOINTMENT_CANCELLED, null);

                sendEmail(patientEmail, patientName, patientSubject, patientBody, null, null);
                sendEmail(doctorEmail, doctorName, doctorSubject, doctorBody, null, null);
        }

        @Async
        public void sendAppointmentReminder(User patientUser, String appointmentDetails) {
                Long userId = patientUser.getId();
                String email = patientUser.getEmail();
                String name = patientUser.getName();
                String phone = patientUser.getPhone();

                AppointmentEmailDetails details = parseAppointmentDetails(appointmentDetails);
                String docPart = details.doctor();
                String datePart = details.date();
                String timePart = details.time();
                String schedulePart = joinDateTime(datePart, timePart);
                String subject = "Reminder: Your Appointment is Tomorrow - MediCare";

                String body = buildEmail(EmailConfig.builder()
                                .theme("amber")
                                .icon(ICON_TIME)
                                .badge("Appointment Tomorrow")
                                .heading("Your appointment is tomorrow!")
                                .subheading("Hi " + firstName(name)
                                                + ", this is a friendly reminder about your upcoming visit.")
                                .rows(new String[][] {
                                                { ICON_DOCTOR, "Doctor", docPart },
                                                { ICON_DATE, "Date", datePart },
                                                { ICON_TIME, "Time", timePart },
                                })
                                .alertIcon(ICON_REFRESH)
                                .alertText("Please bring any previous prescriptions, test reports, or diagnostic records.")
                                .footerNote("Contact us if you need to reschedule. We look forward to seeing you!")
                                .build());

                createNotificationById(userId, "Appointment Tomorrow!",
                                "Reminder: " + appointmentDetails,
                                NotificationType.APPOINTMENT_REMINDER, null);
                sendEmail(email, name, subject, body, null, null);

                if (phone != null && !phone.isBlank()) {
                        sendSms(phone, buildSms("Appointment Tomorrow",
                                        new String[][] {
                                                        { "Doctor", docPart },
                                                        { "Date", details.date() },
                                                        { "Time", details.time() },
                                        },
                                        "Please bring any previous reports or prescriptions."));
                }
        }

        @Async
        public void sendAppointmentReminder(User patientUser, String doctorName, String appointmentDate,
                        String startTime, String endTime) {
                Long userId = patientUser.getId();
                String email = patientUser.getEmail();
                String name = patientUser.getName();
                String phone = patientUser.getPhone();

                String docPart = (doctorName == null || doctorName.isBlank()) ? "Dr. " + firstName(name) : doctorName;
                String datePart = formatDisplayDate(appointmentDate);
                String timePart = formatTimeRange(startTime, endTime);
                String subject = "Reminder: Your Appointment is Tomorrow - MediCare";

                String body = buildEmail(EmailConfig.builder()
                                .theme("amber")
                                .icon(ICON_TIME)
                                .badge("Appointment Tomorrow")
                                .heading("Your appointment is tomorrow!")
                                .subheading("Hi " + firstName(name)
                                                + ", this is a friendly reminder about your upcoming visit.")
                                .rows(new String[][] {
                                                { ICON_DOCTOR, "Doctor", docPart },
                                                { ICON_DATE, "Date", datePart },
                                                { ICON_TIME, "Time", timePart },
                                })
                                .alertIcon(ICON_REFRESH)
                                .alertText("Please bring any previous prescriptions, test reports, or diagnostic records.")
                                .footerNote("Contact us if you need to reschedule. We look forward to seeing you!")
                                .build());

                createNotificationById(userId, "Appointment Tomorrow!",
                                "Reminder: Doctor: " + docPart + " | Date: " + datePart + " | Time: " + timePart,
                                NotificationType.APPOINTMENT_REMINDER, null);
                sendEmail(email, name, subject, body, null, null);

                if (phone != null && !phone.isBlank()) {
                        sendSms(phone, buildSms("Appointment Tomorrow",
                                        new String[][] {
                                                        { "Doctor", docPart },
                                                        { "Date", datePart },
                                                        { "Time", timePart },
                                        },
                                        "Please bring any previous reports or prescriptions."));
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

                String displayName = doctorName.startsWith("Dr. ") ? doctorName : "Dr. " + doctorName;
                String subject = "Your Prescription is Ready - MediCare";

                String body = buildEmail(EmailConfig.builder()
                                .theme("teal")
                                .icon(ICON_PILL)
                                .badge("Prescription Ready")
                                .heading("Your prescription has been issued")
                                .subheading("Hi " + firstName(name)
                                                + ", your doctor has prepared a prescription after your consultation.")
                                .rows(new String[][] {
                                                { ICON_DOCTOR, "Prescribing Doctor", displayName },
                                                { ICON_PILL, "Action Required", "Follow dosage as instructed" },
                                })
                                .alertIcon(ICON_ATTACHMENT)
                                .alertText("Your prescription PDF is attached to this email. You can also download it anytime from your patient portal.")
                                .footerNote("Please follow the dosage instructions carefully and complete the full course.")
                                .build());

                createNotificationById(userId, "New Prescription Added",
                                "Prescription from " + displayName,
                                NotificationType.PRESCRIPTION_ADDED, null);
                sendEmail(email, name, subject, body, prescriptionPdf, "prescription.pdf");
        }

        @Async
        public void sendPaymentConfirmation(User patientUser, Double amount) {
                sendPaymentConfirmation(patientUser, amount, null);
        }

        @Async
        public void sendPaymentConfirmation(User patientUser, Double amount, byte[] updatedAppointmentSlipPdf) {
                Long userId = patientUser.getId();
                String email = patientUser.getEmail();
                String name = patientUser.getName();

                String subject = "Payment Confirmed - MediCare";

                String body = buildEmail(EmailConfig.builder()
                                .theme("green")
                                .icon(ICON_CHECK)
                                .badge("Payment Successful")
                                .heading("Payment received!")
                                .subheading("Hi " + firstName(name)
                                                + ", we've successfully processed your payment. Here's your summary:")
                                .rows(new String[][] {
                                                { ICON_PAYMENT, "Amount Paid", String.format("Rs. %.2f", amount) },
                                                { ICON_INFO, "Status", "Confirmed & Paid" },
                                })
                                .alertIcon(ICON_ATTACHMENT)
                                .alertText("Your updated appointment slip (marked PAID) is attached to this email for your records.")
                                .footerNote("Please retain this confirmation for your reference. Thank you for your prompt payment.")
                                .build());

                createNotificationById(userId, "Payment Confirmed",
                                String.format("Payment of Rs. %.2f received.", amount),
                                NotificationType.PAYMENT_SUCCESS, null);
                sendEmail(email, name, subject, body, updatedAppointmentSlipPdf, "appointment-slip-paid.pdf");
        }

        @Async
        public void sendPayAtAppointmentNotification(User patientUser, User doctorUser,
                        String appointmentDetails, Double amount, byte[] appointmentSlipPdf) {

                Long patientId = patientUser.getId();
                String patientEmail = patientUser.getEmail();
                String patientName = patientUser.getName();
                Long doctorId = doctorUser.getId();
                String doctorEmail = doctorUser.getEmail();
                String doctorName = doctorUser.getName();

                AppointmentEmailDetails details = parseAppointmentDetails(appointmentDetails);
                String docPart = !details.doctor().isBlank() ? details.doctor() : "Dr. " + doctorName;
                String schedulePart = joinDateTime(details.date(), details.time());
                String formattedAmount = String.format("Rs. %.2f", amount != null ? amount : 0.0);

                String patientBody = buildEmail(EmailConfig.builder()
                                .theme("amber")
                                .icon(ICON_INFO)
                                .badge("Payment At Clinic")
                                .heading("Appointment Confirmed")
                                .subheading("Hi " + firstName(patientName)
                                                + ", your appointment is booked and payment will be collected at the clinic.")
                                .rows(new String[][] {
                                                { ICON_DOCTOR, "Doctor", docPart },
                                                { ICON_DATE, "Date", details.date() },
                                                { ICON_TIME, "Time", details.time() },
                                                { ICON_PAYMENT, "Amount Due", formattedAmount },
                                                { ICON_INFO, "Payment", "Pay at appointment time" },
                                })
                                .alertIcon(ICON_ATTACHMENT)
                                .alertText("Please keep the amount ready at the clinic reception before or during your visit.")
                                .footerNote("Your appointment slip is attached to this email.")
                                .build());

                String doctorBody = buildEmail(EmailConfig.builder()
                                .theme("amber")
                                .icon(ICON_PAYMENT)
                                .badge("Payment Pending")
                                .heading("New Appointment - Payment At Clinic")
                                .subheading("Hi Dr. " + firstName(doctorName)
                                                + ", this patient has booked an appointment and chosen to pay at the clinic.")
                                .rows(new String[][] {
                                                { ICON_PATIENT, "Patient", patientName },
                                                { ICON_DATE, "Date", details.date() },
                                                { ICON_TIME, "Time", details.time() },
                                                { ICON_PAYMENT, "Amount Due", formattedAmount },
                                                { ICON_INFO, "Payment", "Collect at appointment time" },
                                })
                                .alertIcon(ICON_ATTACHMENT)
                                .alertText("Please ensure payment is collected before marking the appointment as completed.")
                                .footerNote("The appointment slip is attached for your reference.")
                                .build());

                createNotificationById(patientId, "Pay At Appointment Selected",
                                "Payment will be collected at appointment time. " + appointmentDetails,
                                NotificationType.GENERAL, null);
                createNotificationById(doctorId, "Payment Pending At Clinic",
                                "Patient will pay at appointment time. " + appointmentDetails,
                                NotificationType.GENERAL, null);

                sendEmail(patientEmail, patientName, "Appointment Confirmed - MediCare",
                                patientBody, appointmentSlipPdf, "appointment-slip.pdf");
                sendEmail(doctorEmail, doctorName, "New Appointment- MediCare",
                                doctorBody, appointmentSlipPdf, "appointment-slip.pdf");
        }

        @Async
        public void sendNoShowNotification(User patientUser, String appointmentDetails, String doctorName) {
                Long userId = patientUser.getId();
                String email = patientUser.getEmail();
                String name = patientUser.getName();
                String phone = patientUser.getPhone();

                AppointmentEmailDetails details = parseAppointmentDetails(appointmentDetails);
                String datePart = joinDateTime(details.date(), details.time());

                String subject = "Missed Appointment - Please Reschedule - MediCare";

                String body = buildEmail(EmailConfig.builder()
                                .theme("purple")
                                .icon(ICON_WARNING)
                                .badge("Missed Appointment")
                                .heading("Looks like you missed your visit")
                                .subheading("Hi " + firstName(name)
                                                + ", we noticed you were unable to attend your scheduled appointment. Your health matters to us.")
                                .rows(new String[][] {
                                                { ICON_DOCTOR, "Doctor", "Dr. " + doctorName },
                                                { ICON_DATE, "Date", details.date() },
                                                { ICON_TIME, "Time", details.time() },
                                                { ICON_INFO, "Status", "No-show recorded" },
                                })
                                .alertIcon(ICON_REFRESH)
                                .alertText("Please log in to your patient portal to reschedule at your earliest convenience.")
                                .footerNote("We understand things come up  we're here whenever you're ready to continue your care.")
                                .build());

                createNotificationById(userId, "Missed Appointment  Reschedule Available",
                                "You missed your appointment with Dr. " + doctorName,
                                NotificationType.APPOINTMENT_CANCELLED, null);
                sendEmail(email, name, subject, body, null, null);

                if (phone != null && !phone.isBlank()) {
                        sendSms(phone, buildSms("Missed Appointment",
                                        new String[][] {
                                                        { "Doctor", "Dr. " + doctorName },
                                                        { "Date", details.date() },
                                                        { "Time", details.time() },
                                        },
                                        "Login to MediCare to reschedule at your earliest convenience."));
                }
        }

        @Async
        public void sendVerificationOtp(User user, String otp) {
                String subject = "Verify Your Email - MediCare";
                String body = buildEmail(EmailConfig.builder()
                                .theme("blue")
                                .icon(ICON_LOCK)
                                .badge("Email Verification")
                                .heading("Verify your email address")
                                .subheading("Hi " + firstName(user.getName())
                                                + ", use the one-time code below to activate your MediCare account.")
                                .otpCode(otp)
                                .alertIcon(ICON_TIME)
                                .alertText("This code expires in 15 minutes. Do not share it with anyone, including MediCare staff.")
                                .footerNote("If you didn't create a MediCare account, you can safely ignore this email.")
                                .build());
                sendEmail(user.getEmail(), user.getName(), subject, body, null, null);
        }

        @Async
        public void sendVerificationSuccessEmail(User user) {
                String subject = "Account Verified - Welcome to MediCare!";
                String body = buildEmail(EmailConfig.builder()
                                .theme("green")
                                .icon(ICON_PARTY)
                                .badge("Account Activated")
                                .heading("You're all set!")
                                .subheading("Hi " + firstName(user.getName())
                                                + ", your email has been verified and your MediCare account is now fully active.")
                                .rows(new String[][] {
                                                { ICON_PATIENT, "Account", user.getName() },
                                                { ICON_EMAIL, "Email", user.getEmail() },
                                                { ICON_TAG, "Role", String.valueOf(user.getRole()) },
                                })
                                .alertIcon(ICON_ROCKET)
                                .alertText("You can now log in to book appointments, view prescriptions, and manage your health records.")
                                .footerNote("We're glad to have you on the platform. Your health is our priority.")
                                .build());
                sendEmail(user.getEmail(), user.getName(), subject, body, null, null);
        }

        @Async
        public void sendDoctorUnavailableNotification(List<Appointment> appointments, String doctorName) {
                if (appointments == null || appointments.isEmpty())
                        return;
                for (Appointment appointment : appointments) {
                        User patient = appointment.getPatient().getUser();
                        String subject = "Your Appointment Needs Rescheduling - MediCare";
                        String datePart = appointment.getAppointmentDate() + " at " + appointment.getStartTime();

                        String body = buildEmail(EmailConfig.builder()
                                        .theme("amber")
                                        .icon(ICON_WARNING)
                                        .badge("Action Required")
                                        .heading("Dr. " + doctorName + " is unavailable")
                                        .subheading("Unfortunately your physician is unavailable for the scheduled appointment. Please reschedule at your convenience.")
                                        .rows(new String[][] {
                                                        { ICON_DOCTOR, "Doctor", "Dr. " + doctorName },
                                                        { ICON_DATE, "Date",
                                                                        appointment.getAppointmentDate().toString() },
                                                        { ICON_TIME, "Time", appointment.getStartTime().toString() },
                                                        { ICON_INFO, "Reason", "Doctor unavailable" },
                                        })
                                        .alertIcon(ICON_REFRESH)
                                        .alertText("Please log in to your patient portal to reschedule your appointment at a convenient time.")
                                        .footerNote("We apologise for any disruption to your care plan. Thank you for your understanding.")
                                        .build());
                        sendEmail(patient.getEmail(), patient.getName(), subject, body, null, null);
                }
        }

        @Async
        public void sendFollowUpReminder(User patientUser, String doctorName, String followUpDate) {
                String displayName = doctorName.startsWith("Dr.") ? doctorName : "Dr. " + doctorName;
                String subject = "Follow-Up Reminder - MediCare";

                String body = buildEmail(EmailConfig.builder()
                                .theme("teal")
                                .icon(ICON_DATE)
                                .badge("Follow-Up Reminder")
                                .heading("Your follow-up is approaching")
                                .subheading("Hi " + firstName(patientUser.getName()) + ", your follow-up with "
                                                + displayName + " is coming up soon.")
                                .rows(new String[][] {
                                                { ICON_DOCTOR, "Doctor", displayName },
                                                { ICON_DATE, "Follow-up Date", followUpDate },
                                })
                                .alertIcon(ICON_CLIPBOARD)
                                .alertText("Please book or confirm your follow-up appointment to ensure continuity of your care.")
                                .footerNote("Timely follow-ups are an important part of your recovery and long-term health plan.")
                                .build());
                sendEmail(patientUser.getEmail(), patientUser.getName(), subject, body, null, null);
        }

        //
        // EMAIL BUILDER Clean, Professional, Mobile-First Design
        //

        private static class EmailConfig {
                final String theme; // blue | teal | green | red | amber | purple
                final String icon;
                final String badge;
                final String heading;
                final String subheading;
                final String[][] rows; // { emoji, label, value }
                final String otpCode;
                final String alertIcon;
                final String alertText;
                final String footerNote;

                private EmailConfig(Builder b) {
                        this.theme = b.theme;
                        this.icon = b.icon;
                        this.badge = b.badge;
                        this.heading = b.heading;
                        this.subheading = b.subheading;
                        this.rows = b.rows;
                        this.otpCode = b.otpCode;
                        this.alertIcon = b.alertIcon;
                        this.alertText = b.alertText;
                        this.footerNote = b.footerNote;
                }

                static Builder builder() {
                        return new Builder();
                }

                static class Builder {
                        String theme = "blue";
                        String icon = "";
                        String badge = "";
                        String heading = "";
                        String subheading = "";
                        String[][] rows = new String[0][0];
                        String otpCode = null;
                        String alertIcon = ICON_INFO;
                        String alertText = "";
                        String footerNote = "";

                        Builder theme(String v) {
                                this.theme = v;
                                return this;
                        }

                        Builder icon(String v) {
                                this.icon = v;
                                return this;
                        }

                        Builder badge(String v) {
                                this.badge = v;
                                return this;
                        }

                        Builder heading(String v) {
                                this.heading = v;
                                return this;
                        }

                        Builder subheading(String v) {
                                this.subheading = v;
                                return this;
                        }

                        Builder rows(String[][] v) {
                                this.rows = v;
                                return this;
                        }

                        Builder otpCode(String v) {
                                this.otpCode = v;
                                return this;
                        }

                        Builder alertIcon(String v) {
                                this.alertIcon = v;
                                return this;
                        }

                        Builder alertText(String v) {
                                this.alertText = v;
                                return this;
                        }

                        Builder footerNote(String v) {
                                this.footerNote = v;
                                return this;
                        }

                        EmailConfig build() {
                                return new EmailConfig(this);
                        }
                }
        }

        /**
         * Resolves theme to actual hex colour values.
         * Returns [primary, light, dark] hex strings.
         */
        private String[] themeColors(String theme) {
                return switch (theme) {
                        case "teal" -> new String[] { "#0d9488", "#f0fdfa", "#0f766e" };
                        case "green" -> new String[] { "#16a34a", "#f0fdf4", "#15803d" };
                        case "red" -> new String[] { "#dc2626", "#fef2f2", "#b91c1c" };
                        case "amber" -> new String[] { "#d97706", "#fffbeb", "#b45309" };
                        case "purple" -> new String[] { "#7c3aed", "#f5f3ff", "#6d28d9" };
                        default -> new String[] { "#2563eb", "#eff6ff", "#1d4ed8" }; // blue
                };
        }

        private String buildEmail(EmailConfig cfg) {
                String[] colors = themeColors(cfg.theme);
                String primary = colors[0]; // e.g. #2563eb
                String light = colors[1]; // e.g. #eff6ff
                String dark = colors[2]; // e.g. #1d4ed8

                StringBuilder sb = new StringBuilder();

                sb.append("<!DOCTYPE html>")
                                .append("<html lang=\"en\" xmlns=\"http://www.w3.org/1999/xhtml\" xmlns:v=\"urn:schemas-microsoft-com:vml\" xmlns:o=\"urn:schemas-microsoft-com:office:office\">")
                                .append("<head>")
                                .append("<meta charset=\"UTF-8\">")
                                .append("<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">")
                                .append("<meta http-equiv=\"X-UA-Compatible\" content=\"IE=edge\">")
                                .append("<meta name=\"x-apple-disable-message-reformatting\">")
                                .append("<title>MediCare</title>")
                                .append("<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->")
                                .append("<style>")
                                // Reset
                                .append("*{box-sizing:border-box;}")
                                .append("body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}")
                                .append("table,td{mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;}")
                                .append("img{-ms-interpolation-mode:bicubic;border:0;outline:none;text-decoration:none;display:block;}")
                                .append("body{margin:0!important;padding:0!important;width:100%!important;}")
                                // Base
                                .append("body{background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;}")
                                // Mobile overrides
                                .append("@media only screen and (max-width:600px){")
                                .append(".wrapper{padding:12px!important;}")
                                .append(".card{border-radius:16px!important;}")
                                .append(".card-pad{padding:24px 20px!important;}")
                                .append(".heading{font-size:22px!important;line-height:1.3!important;}")
                                .append(".row-table{display:block!important;width:100%!important;}")
                                .append(".row-label-cell,.row-value-cell{display:block!important;width:100%!important;padding:2px 0!important;}")
                                .append(".row-label-cell{padding-bottom:0!important;}")
                                .append(".otp-code{font-size:32px!important;letter-spacing:0.2em!important;}")
                                .append("}")
                                .append("</style>")
                                .append("</head>")

                                // BODY
                                .append("<body style=\"margin:0;padding:0;background-color:#f1f5f9;\">")
                                .append("<table role=\"presentation\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" width=\"100%\" style=\"background-color:#f1f5f9;\">")
                                .append("<tr><td class=\"wrapper\" style=\"padding:32px 16px;\">")
                                .append("<table role=\"presentation\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" width=\"100%\" style=\"max-width:580px;margin:0 auto;\">")

                                // LOGO HEADER
                                .append("<tr><td align=\"center\" style=\"padding-bottom:24px;\">")
                                .append("<table role=\"presentation\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\">")
                                .append("<tr>")
                                // Teal cross icon
                                .append("<td style=\"background-color:").append(primary)
                                .append(";border-radius:12px;width:42px;height:42px;text-align:center;vertical-align:middle;\">")
                                .append("<span style=\"font-size:24px;line-height:42px;display:block;font-weight:800;color:#ffffff;\">+</span>")
                                .append("</td>")
                                // Wordmark
                                .append("<td style=\"padding-left:10px;vertical-align:middle;\">")
                                .append("<span style=\"font-size:24px;font-weight:700;color:").append(primary)
                                .append(";letter-spacing:-0.5px;\">Medi</span>")
                                .append("<span style=\"font-size:24px;font-weight:700;color:#0f172a;letter-spacing:-0.5px;\">Care</span>")
                                .append("</td>")
                                .append("</tr>")
                                .append("</table>")
                                .append("</td></tr>")

                                // CARD
                                .append("<tr><td class=\"card\" style=\"background-color:#ffffff;border-radius:20px;overflow:hidden;")
                                .append("box-shadow:0 1px 3px rgba(0,0,0,0.08),0 8px 32px rgba(0,0,0,0.06);\">")

                                // Top colour stripe
                                .append("<div style=\"height:4px;background:").append(primary).append(";\"></div>")

                                // Card body
                                .append("<table role=\"presentation\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" width=\"100%\">")
                                .append("<tr><td class=\"card-pad\" style=\"padding:32px 36px 28px;\">")

                                // Badge pill
                                .append("<div style=\"display:inline-block;background-color:").append(light)
                                .append(";border-radius:999px;padding:5px 14px;margin-bottom:20px;\">")
                                .append("<span style=\"font-size:12px;font-weight:600;color:").append(dark)
                                .append(";letter-spacing:0.06em;text-transform:uppercase;\">")
                                .append(cfg.icon).append(" &nbsp;").append(esc(cfg.badge))
                                .append("</span></div>")

                                // Heading
                                .append("<h1 class=\"heading\" style=\"margin:0 0 12px;font-size:26px;font-weight:700;line-height:1.25;")
                                .append("color:#0f172a;letter-spacing:-0.5px;\">")
                                .append(esc(cfg.heading))
                                .append("</h1>")

                                // Subheading
                                .append("<p style=\"margin:0 0 28px;font-size:15px;line-height:1.7;color:#475569;\">")
                                .append(esc(cfg.subheading))
                                .append("</p>");

                // DETAIL ROWS TABLE
                if (cfg.rows != null && cfg.rows.length > 0) {
                        sb.append("<table role=\"presentation\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" width=\"100%\" ")
                                        .append("style=\"border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-bottom:24px;\">")
                                        .append("<tr><td style=\"padding:0;\">")
                                        .append("<table role=\"presentation\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" width=\"100%\">");

                        for (int i = 0; i < cfg.rows.length; i++) {
                                String emoji = cfg.rows[i][0];
                                String label = cfg.rows[i][1];
                                String value = cfg.rows[i][2];

                                String rowBg = (i % 2 == 0) ? "#ffffff" : "#f8fafc";
                                String borderTop = (i > 0) ? "border-top:1px solid #f1f5f9;" : "";

                                sb.append("<tr>")
                                                .append("<td class=\"row-table\" style=\"background-color:")
                                                .append(rowBg)
                                                .append(";").append(borderTop).append("padding:0;\">")
                                                .append("<table role=\"presentation\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" width=\"100%\">")
                                                .append("<tr>")
                                                // Emoji indicator bar
                                                .append("<td style=\"width:44px;background-color:").append(light)
                                                .append(";text-align:center;")
                                                .append("vertical-align:middle;padding:14px 0;\">")
                                                .append("<span style=\"font-size:17px;\">").append(emoji)
                                                .append("</span>")
                                                .append("</td>")
                                                // Label
                                                .append("<td class=\"row-label-cell\" style=\"width:36%;padding:14px 12px 14px 14px;vertical-align:middle;\">")
                                                .append("<span style=\"font-size:11px;font-weight:600;letter-spacing:0.07em;text-transform:uppercase;color:#94a3b8;\">")
                                                .append(esc(label)).append("</span>")
                                                .append("</td>")
                                                // Value
                                                .append("<td class=\"row-value-cell\" style=\"padding:14px 16px 14px 0;vertical-align:middle;\">")
                                                .append("<span style=\"font-size:14px;font-weight:600;color:#0f172a;line-height:1.4;\">")
                                                .append(esc(value)).append("</span>")
                                                .append("</td>")
                                                .append("</tr>")
                                                .append("</table>")
                                                .append("</td></tr>");
                        }

                        sb.append("</table>")
                                        .append("</td></tr></table>");
                }

                // OTP BLOCK
                if (cfg.otpCode != null && !cfg.otpCode.isBlank()) {
                        sb.append("<table role=\"presentation\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" width=\"100%\" style=\"margin-bottom:24px;\">")
                                        .append("<tr><td align=\"center\" style=\"background-color:").append(light)
                                        .append(";border:2px dashed ").append(primary)
                                        .append(";border-radius:14px;padding:28px 20px;\">")
                                        .append("<p style=\"margin:0 0 10px;font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:")
                                        .append(dark).append(";\">")
                                        .append("Your one-time code")
                                        .append("</p>")
                                        .append("<div class=\"otp-code\" style=\"font-size:38px;font-weight:800;letter-spacing:0.35em;color:#0f172a;")
                                        .append("background:#ffffff;border:1px solid #e2e8f0;border-radius:10px;display:inline-block;")
                                        .append("padding:12px 24px;font-family:'Courier New',Courier,monospace;\">")
                                        .append(esc(cfg.otpCode))
                                        .append("</div>")
                                        .append("</td></tr></table>");
                }

                // ALERT BOX
                if (cfg.alertText != null && !cfg.alertText.isBlank()) {
                        sb.append("<table role=\"presentation\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" width=\"100%\" style=\"margin-bottom:8px;\">")
                                        .append("<tr>")
                                        .append("<td width=\"3\" style=\"background-color:").append(primary)
                                        .append(";border-radius:3px 0 0 3px;\"></td>")
                                        .append("<td style=\"background-color:").append(light)
                                        .append(";border-radius:0 10px 10px 0;padding:14px 16px;\">")
                                        .append("<span style=\"font-size:13px;line-height:1.6;color:#334155;\">")
                                        .append(cfg.alertIcon).append(" &nbsp;").append(esc(cfg.alertText))
                                        .append("</span>")
                                        .append("</td>")
                                        .append("</tr></table>");
                }

                // FOOTER NOTE
                if (cfg.footerNote != null && !cfg.footerNote.isBlank()) {
                        sb.append("<p style=\"margin:20px 0 0;font-size:13px;line-height:1.6;color:#94a3b8;\">")
                                        .append(esc(cfg.footerNote))
                                        .append("</p>");
                }

                sb.append("</td></tr></table>") // end card-pad

                                // CARD FOOTER
                                .append("<table role=\"presentation\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" width=\"100%\">")
                                .append("<tr><td style=\"background-color:#f8fafc;border-top:1px solid #f1f5f9;border-radius:0 0 20px 20px;padding:16px 36px;\">")
                                .append("<p style=\"margin:0;font-size:11px;line-height:1.6;color:#94a3b8;\">")
                                .append("MediCare &mdash; Smart Healthcare Management System &nbsp;&middot;&nbsp; ")
                                .append("This is an automated message. Please do not reply.")
                                .append("</p>")
                                .append("</td></tr></table>")

                                .append("</td></tr>") // end card

                                // BELOW CARD
                                .append("<tr><td align=\"center\" style=\"padding:20px 0 0;\">")
                                .append("<p style=\"margin:0;font-size:11px;color:#94a3b8;line-height:1.6;\">")
                                .append("&copy; 2026 MediCare Health Systems. All rights reserved.")
                                .append("</p>")
                                .append("</td></tr>")

                                .append("</table>") // end 580px table
                                .append("</td></tr></table>") // end outer wrapper
                                .append("</body></html>");

                return sb.toString();
        }

        // Simple HTML escaper
        private String esc(String s) {
                if (s == null)
                        return "";
                return s.replace("&", "&amp;")
                                .replace("<", "&lt;")
                                .replace(">", "&gt;")
                                .replace("\"", "&quot;");
        }

        /** Returns first name (up to first space) for greeting. */
        private String firstName(String fullName) {
                if (fullName == null || fullName.isBlank())
                        return "there";
                int space = fullName.indexOf(' ');
                return space > 0 ? fullName.substring(0, space) : fullName;
        }

        // SMS builder
        private String buildSms(String header, String[][] fields, String footer) {
                StringBuilder sb = new StringBuilder();
                sb.append("[MediCare] ").append(header).append("\n");
                sb.append("\n");
                for (String[] f : fields) {
                        sb.append(String.format("%-10s: %s%n", f[0], f[1] != null ? f[1] : "-"));
                }
                sb.append("\n");
                if (footer != null && !footer.isBlank())
                        sb.append(footer);
                return sb.toString().trim();
        }

        // Email & SMS dispatch

        private void sendEmail(String to, String name, String subject, String body,
                        byte[] attachment, String attachmentName) {
                if ("dev".equalsIgnoreCase(notificationMode)) {
                        log.info(" [EMAIL MOCK - DEV MODE] ");
                        log.info(" TO      : {}", to);
                        log.info(" SUBJECT : {}", subject);
                        log.info(" SIZE    : {} chars", body.length());
                        log.info("");
                        return;
                }
                try {
                        MimeMessage msg = mailSender.createMimeMessage();
                        MimeMessageHelper helper = new MimeMessageHelper(msg, attachment != null,
                                        StandardCharsets.UTF_8.name());
                        helper.setFrom(fromEmail);
                        helper.setTo(to);
                        helper.setSubject(subject);
                        helper.setText(body, true);
                        if (attachment != null) {
                                helper.addAttachment(attachmentName != null ? attachmentName : "attachment.pdf",
                                                new ByteArrayResource(attachment));
                        }
                        mailSender.send(msg);
                        log.info("Email sent to {}", to);
                } catch (MessagingException e) {
                        log.error("Failed to send email to {}: {}", to, e.getMessage());
                }
        }

        private void sendSms(String phone, String message) {
                if ("dev".equalsIgnoreCase(notificationMode)) {
                        log.info(" [SMS MOCK - DEV MODE] ");
                        log.info(" TO  : {}", phone);
                        log.info(" MSG : {}", message);
                        log.info("");
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
