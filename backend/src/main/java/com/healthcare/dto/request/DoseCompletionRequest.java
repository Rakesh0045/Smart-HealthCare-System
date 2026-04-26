package com.healthcare.dto.request;

import jakarta.validation.constraints.*;
import lombok.*;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DoseCompletionRequest {

    @NotNull
    private Long prescriptionMedicineId;

    @NotNull
    @Min(0)
    @Max(3)
    private Integer slotIndex;

    private LocalDate doseDate;

    @NotNull
    private Boolean taken;
}
