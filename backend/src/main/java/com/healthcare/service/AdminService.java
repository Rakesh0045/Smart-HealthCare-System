package com.healthcare.service;

import com.healthcare.dto.response.DashboardStatsResponse;
import com.healthcare.enums.AppointmentStatus;
import com.healthcare.enums.Role;
import com.healthcare.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.util.*;

@Service
@RequiredArgsConstructor
public class AdminService {

        private final UserRepository userRepo;
        private final DoctorRepository doctorRepo;
        private final PatientRepository patientRepo;
        private final AppointmentRepository appointmentRepo;
        private final PaymentRepository paymentRepo;
        private final DoctorService doctorService;

        @Transactional(readOnly = true)
        public DashboardStatsResponse getDashboardStats() {
                long totalAppointments = appointmentRepo.count();
                Double revenue = paymentRepo.getTotalRevenue();

                // Appointments per day for last 7 days
                LocalDate end = LocalDate.now();
                LocalDate start = end.minusDays(6);
                List<Object[]> raw = appointmentRepo.countAppointmentsByDateRange(start, end);
                List<Map<String, Object>> byDate = raw.stream().map(r -> {
                        Map<String, Object> row = new HashMap<>();
                        row.put("date", r[0] != null ? r[0].toString() : "");
                        row.put("count", r[1] != null ? r[1] : 0L);
                        return row;
                }).toList();

                // Top 5 doctors by total completed appointments
                List<Map<String, Object>> topDoctors = doctorRepo.findAll().stream()
                                .sorted(Comparator
                                                .comparingLong(d -> -appointmentRepo.countCompletedByDoctor(d.getId())))
                                .limit(5)
                                .map(d -> {
                                        Map<String, Object> row = new HashMap<>();
                                        row.put("doctorName",
                                                        d.getUser() != null && d.getUser().getName() != null
                                                                        ? d.getUser().getName()
                                                                        : "Unknown Doctor");
                                        row.put("specialization",
                                                        d.getSpecialization() != null ? d.getSpecialization()
                                                                        : "General");
                                        row.put("completedAppointments",
                                                        appointmentRepo.countCompletedByDoctor(d.getId()));
                                        row.put("rating", d.getRating() != null ? d.getRating() : 0.0);
                                        return row;
                                })
                                .toList();

                List<Map<String, Object>> byStatus = List.of(
                                Map.of("status", "Scheduled", "count",
                                                appointmentRepo.countByStatus(AppointmentStatus.SCHEDULED)),
                                Map.of("status", "Completed", "count",
                                                appointmentRepo.countByStatus(AppointmentStatus.COMPLETED)),
                                Map.of("status", "Cancelled", "count",
                                                appointmentRepo.countByStatus(AppointmentStatus.CANCELLED)));

                return DashboardStatsResponse.builder()
                                .totalUsers(userRepo.count())
                                .totalDoctors(userRepo.countByRole(Role.DOCTOR))
                                .totalPatients(userRepo.countByRole(Role.PATIENT))
                                .totalAppointments(totalAppointments)
                                .scheduledAppointments(appointmentRepo.countByStatus(AppointmentStatus.SCHEDULED))
                                .completedAppointments(appointmentRepo.countByStatus(AppointmentStatus.COMPLETED))
                                .cancelledAppointments(appointmentRepo.countByStatus(AppointmentStatus.CANCELLED))
                                .totalRevenue(revenue != null ? revenue : 0.0)
                                .todayAppointments(appointmentRepo.countByDate(LocalDate.now()))
                                .appointmentsByDate(byDate)
                                .topDoctors(topDoctors)
                                .appointmentsByStatus(byStatus)
                                .build();
        }
}
