package com.healthcare.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EpisodeFollowupRequest {
    @NotNull
    private Long episodeId;

    @NotNull
    private Long appointmentId;

    private String followupPurpose;

    private String notes;
}
