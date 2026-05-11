package com.healthcare.dto.response;

import com.healthcare.enums.FollowupType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EpisodeFollowupResponse {
    private Long id;
    private Long episodeId;
    private Long appointmentId;
    private String appointmentDate;
    private String appointmentTime;
    private String doctorName;
    private FollowupType followupType;
    private String followupPurpose;
    private String notes;
    private LocalDateTime createdAt;
}
