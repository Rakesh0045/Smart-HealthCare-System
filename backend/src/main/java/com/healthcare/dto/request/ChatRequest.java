package com.healthcare.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ChatRequest {

    @NotNull(message = "patientId is required")
    private Long patientId;

    @NotBlank(message = "message is required")
    private String message;

    /** Optional: scope the chat to a specific treatment episode */
    private Long episodeId;

    /**
     * Optional session ID for conversation continuity across requests.
     * If omitted, a session key is auto-generated from userId + patientId + episodeId.
     */
    private String sessionId;
}