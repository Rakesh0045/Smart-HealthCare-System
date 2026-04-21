package com.healthcare.dto.response;
import lombok.*;
import java.util.List;
import java.util.Map;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class DashboardStatsResponse {
    private long totalUsers;
    private long totalDoctors;
    private long totalPatients;
    private long totalAppointments;
    private long scheduledAppointments;
    private long completedAppointments;
    private long cancelledAppointments;
    private double totalRevenue;
    private long todayAppointments;
    private List<Map<String, Object>> appointmentsByDate;
    private List<Map<String, Object>> topDoctors;
    private List<Map<String, Object>> appointmentsByStatus;
}
