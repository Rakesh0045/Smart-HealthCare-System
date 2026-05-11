package com.healthcare.controller;

import com.healthcare.dto.request.ChatRequest;
import com.healthcare.dto.response.ApiResponse;
import com.healthcare.dto.response.ChatResponse;
import com.healthcare.exception.BadRequestException;
import com.healthcare.repository.AppointmentRepository;
import com.healthcare.repository.DoctorRepository;
import com.healthcare.repository.PatientRepository;
import com.healthcare.repository.UserRepository;
import com.healthcare.service.HealthAssistantService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/assistant")
@RequiredArgsConstructor
public class HealthAssistantController {

    private final HealthAssistantService healthAssistantService;
    private final UserRepository userRepo;
    private final PatientRepository patientRepo;
    private final DoctorRepository doctorRepo;
    private final AppointmentRepository appointmentRepo;

    /**
     * POST /api/assistant/chat
     * Supports both episode-scoped (episodeId provided) and global history chat.
     * sessionId is optional — auto-generated if not provided.
     */
    @PostMapping("/chat")
    @PreAuthorize("hasAnyRole('PATIENT','DOCTOR')")
    public ResponseEntity<ApiResponse<ChatResponse>> chat(
            @Valid @RequestBody ChatRequest req,
            @AuthenticationPrincipal UserDetails ud) {

        Long actingUserId = resolveUserId(ud);
        String role = extractRole(ud);

        // Authorization checks
        if ("ROLE_PATIENT".equals(role)) {
            var patient = patientRepo.findByUserId(actingUserId)
                    .orElseThrow(() -> new BadRequestException("Patient profile not found. Please complete your profile first."));
            if (!patient.getId().equals(req.getPatientId())) {
                throw new BadRequestException("You may only query your own patient data.");
            }
        } else if ("ROLE_DOCTOR".equals(role)) {
            var doctor = doctorRepo.findByUserId(actingUserId)
                    .orElseThrow(() -> new BadRequestException("Doctor profile not found."));
            // FIX: correct param order — findCompletedByPatientAndDoctor(patientId, doctorId)
            boolean hasTreated = !appointmentRepo
                    .findCompletedByPatientAndDoctor(req.getPatientId(), doctor.getId())
                    .isEmpty();
            if (!hasTreated) {
                throw new BadRequestException("You may only query data for patients you have treated.");
            }
        }

        // Build session key — include sessionId from request if provided
        String sessionId = req.getSessionId() != null ? req.getSessionId()
                : actingUserId + "_" + req.getPatientId()
                + (req.getEpisodeId() != null ? "_ep" + req.getEpisodeId() : "_global");

        ChatResponse response = healthAssistantService.chat(
                req.getPatientId(), req.getMessage(), req.getEpisodeId(),
                actingUserId, role, sessionId);

        return ResponseEntity.ok(ApiResponse.success(response, "Assistant response generated"));
    }

    /**
     * POST /api/assistant/episode/{episodeId}/insights
     * Generate AI insights summary for a specific treatment episode.
     */
    @PostMapping("/episode/{episodeId}/insights")
    @PreAuthorize("hasAnyRole('PATIENT','DOCTOR')")
    public ResponseEntity<ApiResponse<ChatResponse>> episodeInsights(
            @PathVariable Long episodeId,
            @AuthenticationPrincipal UserDetails ud) {

        Long actingUserId = resolveUserId(ud);
        String role = extractRole(ud);

        ChatResponse response = healthAssistantService.generateEpisodeInsights(episodeId, actingUserId, role);
        return ResponseEntity.ok(ApiResponse.success(response, "Episode insights generated"));
    }

    /**
     * POST /api/assistant/patient/{patientId}/summary
     * Generate a comprehensive AI medical history summary.
     */
    @PostMapping("/patient/{patientId}/summary")
    @PreAuthorize("hasAnyRole('PATIENT','DOCTOR')")
    public ResponseEntity<ApiResponse<ChatResponse>> historySummary(
            @PathVariable Long patientId,
            @AuthenticationPrincipal UserDetails ud) {

        Long actingUserId = resolveUserId(ud);
        String role = extractRole(ud);

        if ("ROLE_PATIENT".equals(role)) {
            var patient = patientRepo.findByUserId(actingUserId)
                    .orElseThrow(() -> new BadRequestException("Patient profile not found."));
            if (!patient.getId().equals(patientId)) {
                throw new BadRequestException("You may only request your own history summary.");
            }
        }

        ChatResponse response = healthAssistantService.generateHistorySummary(patientId, actingUserId, role);
        return ResponseEntity.ok(ApiResponse.success(response, "History summary generated"));
    }

    /**
     * DELETE /api/assistant/session/{sessionId}
     * Clear conversation history for a session (start fresh).
     */
    @DeleteMapping("/session/{sessionId}")
    @PreAuthorize("hasAnyRole('PATIENT','DOCTOR')")
    public ResponseEntity<ApiResponse<Void>> clearSession(
            @PathVariable String sessionId,
            @AuthenticationPrincipal UserDetails ud) {
        healthAssistantService.clearSession(sessionId);
        return ResponseEntity.ok(ApiResponse.success(null, "Session cleared"));
    }

    private Long resolveUserId(UserDetails ud) {
        return userRepo.findByEmail(ud.getUsername())
                .orElseThrow(() -> new BadRequestException("User not found"))
                .getId();
    }

    private String extractRole(UserDetails ud) {
        return ud.getAuthorities().isEmpty() ? "" : ud.getAuthorities().iterator().next().getAuthority();
    }
}