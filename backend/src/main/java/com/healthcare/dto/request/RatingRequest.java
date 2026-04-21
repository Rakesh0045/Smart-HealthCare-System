package com.healthcare.dto.request;
import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class RatingRequest {
    @NotNull private Long appointmentId;
    @NotNull @Min(1) @Max(5) private Integer rating;
    private String review;
}
