package com.healthcare.dto.request;
import com.healthcare.enums.DayOfWeekEnum;
import jakarta.validation.constraints.*;
import lombok.Data;
import java.time.LocalTime;

@Data
public class AvailabilityRequest {
    @NotNull private DayOfWeekEnum dayOfWeek;
    @NotNull private LocalTime startTime;
    @NotNull private LocalTime endTime;
    private Boolean isAvailable = true;
    private LocalTime breakStart;
    private LocalTime breakEnd;
}
