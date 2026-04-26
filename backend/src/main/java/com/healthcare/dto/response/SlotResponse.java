package com.healthcare.dto.response;
import lombok.*;
import java.time.LocalTime;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class SlotResponse {
    private LocalTime startTime;
    private LocalTime endTime;
    private boolean available;
    private String displayTime;
}
