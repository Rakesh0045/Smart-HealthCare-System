package com.healthcare.dto.response;

import lombok.*;

import java.util.List;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class PatientAnalyticsResponse {
    private Long patientId;
    private String patientName;
    private long totalEpisodes;
    private long activeEpisodes;
    private double adherenceRate;
    private List<EpisodeDetail> episodes;

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class EpisodeDetail {
        private Long episodeId;
        private String episodeName;
        private String status;
        private long followupsScheduled;
        private long followupsCompleted;
        private long followupsMissed;
        private Long lengthDays;
    }
}
