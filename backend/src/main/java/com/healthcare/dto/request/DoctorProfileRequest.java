package com.healthcare.dto.request;
import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class DoctorProfileRequest {
    @NotBlank private String specialization;
    @NotNull @Min(0) @Max(60) private Integer experience;
    @NotNull @Min(0) private Double consultationFee;
    private String bio;
    private String qualification;
    private String hospital;
    private Integer slotDuration = 30;
}
