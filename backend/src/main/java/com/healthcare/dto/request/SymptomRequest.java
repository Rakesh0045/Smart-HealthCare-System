package com.healthcare.dto.request;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class SymptomRequest {
    @NotBlank(message = "Symptoms description is required")
    private String symptoms;
}
