package com.healthcare.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class LinkRecordRequest {
    @NotNull
    private Long episodeId;
}
