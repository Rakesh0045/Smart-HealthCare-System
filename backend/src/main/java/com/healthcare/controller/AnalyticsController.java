package com.healthcare.controller;

import com.healthcare.dto.response.ApiResponse;
import com.healthcare.dto.response.EpisodeSummaryAnalyticsResponse;
import com.healthcare.dto.response.PatientAnalyticsResponse;
import com.healthcare.service.AnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    @GetMapping("/episodes/summary")
    @PreAuthorize("hasAnyRole('ADMIN','DOCTOR')")
    public ResponseEntity<ApiResponse<EpisodeSummaryAnalyticsResponse>> episodeSummary(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(ApiResponse.success(analyticsService.getEpisodeSummary(from, to)));
    }

    @GetMapping("/patient/{patientId}")
    @PreAuthorize("hasAnyRole('PATIENT','DOCTOR')")
    public ResponseEntity<ApiResponse<PatientAnalyticsResponse>> patientAnalytics(
            @PathVariable Long patientId) {
        return ResponseEntity.ok(ApiResponse.success(analyticsService.getPatientAnalytics(patientId)));
    }
}
