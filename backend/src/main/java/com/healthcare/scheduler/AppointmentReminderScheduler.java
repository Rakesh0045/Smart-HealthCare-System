package com.healthcare.scheduler;

import com.healthcare.entity.Appointment;
import com.healthcare.enums.AppointmentStatus;
import com.healthcare.repository.AppointmentRepository;
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
                String details = String.format(
                        "Dr. %s (%s) | %s at %s",
                        appointment.getDoctor().getUser().getName(),
                        appointment.getDoctor().getSpecialization(),
                        appointment.getAppointmentDate(),
                        appointment.getStartTime()
                );
                notificationService.sendAppointmentReminder(
                        appointment.getPatient().getUser(), details);

                appointment.setReminderSent(true);
                appointmentRepo.save(appointment);
            } catch (Exception e) {
                log.error("Failed to send reminder for appointment {}: {}",
                        appointment.getId(), e.getMessage());
            }
        }
    }

    /**
     * Runs every hour — auto-completes missed/no-show appointments older than 2 hours.
     */
    @Scheduled(cron = "0 0 * * * *")
    @Transactional
    public void autoMarkNoShow() {
        // Mark appointments from yesterday that are still SCHEDULED as NO_SHOW
        LocalDate yesterday = LocalDate.now().minusDays(1);
        List<Appointment> missed = appointmentRepo
                .findByStatusAndReminderSentFalseAndAppointmentDate(
                        AppointmentStatus.SCHEDULED, yesterday);

        for (Appointment a : missed) {
            a.setStatus(AppointmentStatus.NO_SHOW);
            appointmentRepo.save(a);
            log.debug("Marked appointment {} as NO_SHOW", a.getId());
        }

        if (!missed.isEmpty()) {
            log.info("Auto-marked {} appointments as NO_SHOW", missed.size());
        }
    }
}
