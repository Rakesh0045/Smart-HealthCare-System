package com.healthcare.dto.response;

import com.healthcare.enums.AppointmentStatus;
import com.healthcare.enums.PaymentStatus;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AppointmentResponse {
    private Long id;
    private Long patientId;
    private String patientName;
    private String patientEmail;
    private String patientPhone;
    private Long doctorId;
    private String doctorName;
    private String doctorSpecialization;
    private String doctorPhone;
    private LocalDate appointmentDate;
    private LocalTime startTime;
    private LocalTime endTime;
    private AppointmentStatus status;
    private String reason;
    private String notes;
    private String doctorNotes;
    private PaymentStatus paymentStatus;
    private Double consultationFee;
    private Boolean isFirstVisit;
    private boolean hasPrescription;
    private boolean hasRating;
    private Integer rescheduleCount;
    private String cancellationReason;
    private LocalDateTime cancellationTimestamp;
    private Boolean isNoShow;
    private LocalDateTime createdAt;
}
