package com.healthcare.dto.response;
import com.healthcare.enums.DayOfWeekEnum;
import lombok.*;
import java.time.LocalTime;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class AvailabilityResponse {
    private Long id;
    private DayOfWeekEnum dayOfWeek;
    private LocalTime startTime;
    private LocalTime endTime;
    private Boolean isAvailable;
    private LocalTime breakStart;
    private LocalTime breakEnd;
}
