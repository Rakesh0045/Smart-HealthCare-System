package com.healthcare.dto.request;
import jakarta.validation.constraints.*;
import lombok.Data;
import java.time.LocalDate;
import java.time.LocalTime;

@Data
public class AppointmentRequest {
    @NotNull private Long doctorId;
    @NotNull @FutureOrPresent(message = "Appointment date must not be in the past")
    private LocalDate appointmentDate;
    @NotNull private LocalTime startTime;
    private String reason;
    private Boolean isFirstVisit = true;
}
