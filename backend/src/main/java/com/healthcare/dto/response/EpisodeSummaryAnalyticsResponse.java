package com.healthcare.dto.response;

import lombok.*;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class EpisodeSummaryAnalyticsResponse {
    private long totalEpisodes;
    private long active;
    private long resolved;
    private long chronic;
    private double avgEpisodeLengthDays;
    private long followupsScheduled;
    private long followupsCompleted;
    private double missedRate;
}
