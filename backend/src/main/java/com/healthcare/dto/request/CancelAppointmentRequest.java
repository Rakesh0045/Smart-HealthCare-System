package com.healthcare.dto.request;

import lombok.Data;

@Data
public class CancelAppointmentRequest {
    private String reason; // e.g., "PERSONAL", "MEDICAL", "DOCTOR_UNAVAILABLE", "SCHEDULING_CONFLICT",
                           // "OTHER"
    private String reasonText; // Optional detailed reason
}
