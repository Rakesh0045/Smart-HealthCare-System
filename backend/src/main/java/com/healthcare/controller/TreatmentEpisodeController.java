package com.healthcare.controller;

import com.healthcare.dto.request.EpisodeFollowupRequest;
import com.healthcare.dto.request.EpisodeStatusTransitionRequest;
import com.healthcare.dto.request.TreatmentEpisodeRequest;
import com.healthcare.dto.response.ApiResponse;
import com.healthcare.dto.response.EpisodeFollowupResponse;
import com.healthcare.dto.response.MedicalRecordResponse;
import com.healthcare.dto.response.TreatmentEpisodeResponse;
import com.healthcare.enums.FollowupType;
import com.healthcare.repository.UserRepository;
import com.healthcare.service.LifestyleRecommendationService;
import com.healthcare.service.TreatmentEpisodeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@Slf4j
@RequestMapping("/api/treatment-episodes")
@RequiredArgsConstructor
public class TreatmentEpisodeController {

    private final TreatmentEpisodeService episodeService;
    private final LifestyleRecommendationService lifestyleRecommendationService;
    private final UserRepository userRepo;

    @PostMapping
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<ApiResponse<TreatmentEpisodeResponse>> create(
            @Valid @RequestBody TreatmentEpisodeRequest req,
            @AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(ApiResponse.success(
                episodeService.createEpisode(req, uid(ud)),
                "Treatment episode created"));
    }

    @GetMapping("/my")
    @PreAuthorize("hasAnyRole('PATIENT','DOCTOR')")
    public ResponseEntity<ApiResponse<List<TreatmentEpisodeResponse>>> getMy(
            @AuthenticationPrincipal UserDetails ud) {
        Long userId = uid(ud);
        String role = role(ud);
        return ResponseEntity.ok(ApiResponse.success(episodeService.getMyEpisodes(userId, role)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('PATIENT','DOCTOR')")
    public ResponseEntity<ApiResponse<TreatmentEpisodeResponse>> getById(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails ud) {
        Long userId = uid(ud);
        String role = role(ud);
        return ResponseEntity.ok(ApiResponse.success(episodeService.getEpisodeById(id, userId, role)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<ApiResponse<TreatmentEpisodeResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody TreatmentEpisodeRequest req,
            @AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(ApiResponse.success(
                episodeService.updateEpisode(id, req, uid(ud)),
                "Treatment episode updated"));
    }

    @PostMapping("/{id}/followups")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<ApiResponse<EpisodeFollowupResponse>> addFollowup(
            @PathVariable Long id,
            @Valid @RequestBody EpisodeFollowupRequest req,
            @AuthenticationPrincipal UserDetails ud) {
        req.setEpisodeId(id);
        return ResponseEntity.ok(ApiResponse.success(
                episodeService.addFollowup(req, uid(ud)),
                "Follow-up added to episode"));
    }

    @PatchMapping("/followups/{followupId}/status")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<ApiResponse<EpisodeFollowupResponse>> updateFollowupStatus(
            @PathVariable Long followupId,
            @RequestParam FollowupType status,
            @AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(ApiResponse.success(
                episodeService.updateFollowupStatus(followupId, status, uid(ud)),
                "Follow-up status updated"));
    }

    @PostMapping("/{id}/status")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<ApiResponse<TreatmentEpisodeResponse>> transitionStatus(
            @PathVariable Long id,
            @Valid @RequestBody EpisodeStatusTransitionRequest req,
            @AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(ApiResponse.success(
                episodeService.transitionEpisodeStatus(id, req.getStatus(), uid(ud)),
                "Episode status updated"));
    }

    @GetMapping("/{id}/records")
    @PreAuthorize("hasAnyRole('PATIENT','DOCTOR')")
    public ResponseEntity<ApiResponse<List<MedicalRecordResponse>>> getLinkedRecords(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails ud) {
        Long userId = uid(ud);
        String role = role(ud);
        episodeService.getEpisodeById(id, userId, role);
        return ResponseEntity.ok(ApiResponse.success(episodeService.getLinkedRecords(id)));
    }

    @PostMapping("/{id}/lifestyle-advice")
    @PreAuthorize("hasAnyRole('PATIENT','DOCTOR')")
    public ResponseEntity<ApiResponse<Object>> generateLifestyleAdvice(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails ud) {
        Long userId = uid(ud);
        String role = role(ud);
        episodeService.getEpisodeById(id, userId, role);
        try {
            Object advice = lifestyleRecommendationService.generateAdvice(id);
            return ResponseEntity.ok(ApiResponse.success(advice, "Lifestyle advice generated"));
        } catch (Exception e) {
            log.error("Failed to generate lifestyle advice for episode {}: {}", id, e.getMessage(), e);
            return ResponseEntity.status(500).body(ApiResponse.error("Failed to generate lifestyle advice"));
        }
    }

    private Long uid(UserDetails ud) {
        return userRepo.findByEmail(ud.getUsername())
                .orElseThrow(() -> new com.healthcare.exception.ResourceNotFoundException("User not found"))
                .getId();
    }

    private String role(UserDetails ud) {
        return ud.getAuthorities().isEmpty() ? "" : ud.getAuthorities().iterator().next().getAuthority();
    }
}
