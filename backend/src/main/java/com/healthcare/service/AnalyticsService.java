package com.healthcare.service;

import com.healthcare.dto.response.EpisodeSummaryAnalyticsResponse;
import com.healthcare.dto.response.PatientAnalyticsResponse;
import com.healthcare.entity.TreatmentEpisode;
import com.healthcare.enums.EpisodeStatus;
import com.healthcare.enums.FollowupType;
import com.healthcare.repository.TreatmentEpisodeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AnalyticsService {

    private final TreatmentEpisodeRepository episodeRepo;

    @Transactional(readOnly = true)
    public EpisodeSummaryAnalyticsResponse getEpisodeSummary(LocalDate from, LocalDate to) {
        List<TreatmentEpisode> episodes = episodeRepo.findByStartDateBetween(from, to);

        long total = episodes.size();
        long active = episodes.stream().filter(e -> e.getStatus() == EpisodeStatus.ACTIVE).count();
        long resolved = episodes.stream().filter(e -> e.getStatus() == EpisodeStatus.RESOLVED).count();
        long chronic = episodes.stream().filter(e -> e.getStatus() == EpisodeStatus.CHRONIC).count();

        double avgLength = episodes.stream()
                .filter(e -> e.getEndDate() != null)
                .mapToLong(e -> ChronoUnit.DAYS.between(e.getStartDate(), e.getEndDate()))
                .average().orElse(0.0);

        long scheduled = episodes.stream().flatMap(e -> e.getFollowups().stream())
                .filter(f -> f.getFollowupType() == FollowupType.SCHEDULED).count();
        long completed = episodes.stream().flatMap(e -> e.getFollowups().stream())
                .filter(f -> f.getFollowupType() == FollowupType.COMPLETED).count();
        long missed = episodes.stream().flatMap(e -> e.getFollowups().stream())
                .filter(f -> f.getFollowupType() == FollowupType.MISSED).count();
        double missedRate = (scheduled + completed + missed) > 0
                ? (double) missed / (scheduled + completed + missed) * 100
                : 0.0;

        return EpisodeSummaryAnalyticsResponse.builder()
                .totalEpisodes(total)
                .active(active)
                .resolved(resolved)
                .chronic(chronic)
                .avgEpisodeLengthDays(avgLength)
                .followupsScheduled(scheduled)
                .followupsCompleted(completed)
                .missedRate(Math.round(missedRate * 100.0) / 100.0)
                .build();
    }

    @Transactional(readOnly = true)
    public PatientAnalyticsResponse getPatientAnalytics(Long patientId) {
        List<TreatmentEpisode> episodes = episodeRepo.findByPatientIdOrderByStartDateDesc(patientId);

        long total = episodes.size();
        long active = episodes.stream().filter(e -> e.getStatus() == EpisodeStatus.ACTIVE).count();

        long totalFollowups = episodes.stream().mapToLong(e -> e.getFollowups().size()).sum();
        long completedFollowups = episodes.stream().flatMap(e -> e.getFollowups().stream())
                .filter(f -> f.getFollowupType() == FollowupType.COMPLETED).count();
        double adherence = totalFollowups > 0 ? (double) completedFollowups / totalFollowups * 100 : 0.0;

        List<PatientAnalyticsResponse.EpisodeDetail> details = episodes.stream().map(e -> {
            long scheduled = e.getFollowups().stream().filter(f -> f.getFollowupType() == FollowupType.SCHEDULED).count();
            long completed = e.getFollowups().stream().filter(f -> f.getFollowupType() == FollowupType.COMPLETED).count();
            long missed = e.getFollowups().stream().filter(f -> f.getFollowupType() == FollowupType.MISSED).count();
            Long length = e.getEndDate() != null ? ChronoUnit.DAYS.between(e.getStartDate(), e.getEndDate()) : null;
            return PatientAnalyticsResponse.EpisodeDetail.builder()
                    .episodeId(e.getId())
                    .episodeName(e.getEpisodeName())
                    .status(e.getStatus().name())
                    .followupsScheduled(scheduled)
                    .followupsCompleted(completed)
                    .followupsMissed(missed)
                    .lengthDays(length)
                    .build();
        }).collect(Collectors.toList());

        String patientName = episodes.isEmpty() ? "" : episodes.get(0).getPatient().getUser().getName();

        return PatientAnalyticsResponse.builder()
                .patientId(patientId)
                .patientName(patientName)
                .totalEpisodes(total)
                .activeEpisodes(active)
                .adherenceRate(Math.round(adherence * 100.0) / 100.0)
                .episodes(details)
                .build();
    }
}
