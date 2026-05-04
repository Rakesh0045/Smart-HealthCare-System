package com.healthcare.scheduler;

import com.healthcare.entity.Appointment;
import com.healthcare.entity.Prescription;
import com.healthcare.enums.AppointmentStatus;
import com.healthcare.repository.AppointmentRepository;
import com.healthcare.repository.PrescriptionRepository;
import com.healthcare.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class AppointmentReminderScheduler {

    private final AppointmentRepository appointmentRepo;
    private final PrescriptionRepository prescriptionRepo;
    private final NotificationService notificationService;

    /**
     * Runs every day at 9 AM — sends reminders for tomorrow's appointments.
     */
    @Scheduled(cron = "0 0 9 * * *")
    @Transactional
    public void sendDailyReminders() {
        LocalDate tomorrow = LocalDate.now().plusDays(1);
        List<Appointment> appointments = appointmentRepo
                .findByStatusAndReminderSentFalseAndAppointmentDate(
                        AppointmentStatus.SCHEDULED, tomorrow);

        log.info("Sending reminders for {} appointments on {}", appointments.size(), tomorrow);

        for (Appointment appointment : appointments) {
            try {
                notificationService.sendAppointmentReminder(
                        appointment.getPatient().getUser(),
                        "Dr. " + appointment.getDoctor().getUser().getName(),
                        appointment.getAppointmentDate().toString(),
                        appointment.getStartTime().toString(),
                        appointment.getEndTime() != null ? appointment.getEndTime().toString() : null);

                appointment.setReminderSent(true);
                appointmentRepo.save(appointment);
            } catch (Exception e) {
                log.error("Failed to send reminder for appointment {}: {}",
                        appointment.getId(), e.getMessage());
            }
        }
    }

    /**
     * Runs every minute — auto-marks missed appointments as no-show only after a
     * grace period.
     */
    @Scheduled(cron = "0 */1 * * * *")
    @Transactional
    public void autoMarkNoShow() {
        // Mark only appointments that are well past their end time on the same day.
        LocalDate today = LocalDate.now();
        List<Appointment> overdue = appointmentRepo.findOverdueAppointments(today);

        for (Appointment a : overdue) {
            try {
                a.setStatus(AppointmentStatus.NO_SHOW);
                appointmentRepo.save(a);
                String details = String.format("Dr. %s | %s at %s",
                        a.getDoctor().getUser().getName(), a.getAppointmentDate(), a.getStartTime());
                notificationService.sendNoShowNotification(a.getPatient().getUser(), details,
                        a.getDoctor().getUser().getName());
                log.debug("Auto-marked appointment {} as NO_SHOW", a.getId());
            } catch (Exception e) {
                log.error("Failed to auto-mark appointment {} as NO_SHOW: {}", a.getId(), e.getMessage());
            }
        }

        if (!overdue.isEmpty())
            log.info("Auto-marked {} appointments as NO_SHOW", overdue.size());
    }

    /**
     * Runs every day at 10 AM — reminds patients about follow-ups scheduled for
     * tomorrow.
     */
    @Scheduled(cron = "0 0 10 * * *")
    @Transactional
    public void sendFollowUpReminders() {
        LocalDate tomorrow = LocalDate.now().plusDays(1);
        List<Prescription> prescriptions = prescriptionRepo.findByFollowUpDateAndIsActiveTrue(tomorrow);
        log.info("Sending follow-up reminders for {} prescriptions on {}", prescriptions.size(), tomorrow);

        for (Prescription prescription : prescriptions) {
            try {
                notificationService.sendFollowUpReminder(
                        prescription.getPatient().getUser(),
                        prescription.getDoctor().getUser().getName(),
                        tomorrow.toString());
            } catch (Exception e) {
                log.error("Failed to send follow-up reminder for prescription {}: {}",
                        prescription.getId(), e.getMessage());
            }
        }
    }
}
