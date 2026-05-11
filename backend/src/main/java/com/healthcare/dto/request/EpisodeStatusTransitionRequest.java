package com.healthcare.dto.request;

import com.healthcare.enums.EpisodeStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class EpisodeStatusTransitionRequest {
    @NotNull
    private EpisodeStatus status;
}
