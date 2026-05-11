package com.healthcare.controller;
import com.healthcare.dto.request.*;
import com.healthcare.dto.response.*;
import com.healthcare.enums.Role;
import com.healthcare.repository.PatientRepository;
import com.healthcare.repository.TreatmentEpisodeRepository;
import com.healthcare.repository.UserRepository;
import com.healthcare.service.*;
import com.healthcare.exception.BadRequestException;
import com.healthcare.exception.ResourceNotFoundException;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/patient") @RequiredArgsConstructor
public class PatientController {
    private final PatientService patientService;
    private final MedicalRecordService medicalRecordService;
    private final TreatmentEpisodeService episodeService;
    private final TreatmentEpisodeRepository episodeRepo;
    private final PatientRepository patientRepo;
    private final RatingService ratingService;
    private final UserRepository userRepo;

    @GetMapping("/profile") @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<ApiResponse<PatientResponse>> profile(@AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(ApiResponse.success(patientService.getPatientProfile(uid(ud))));
    }
    @PostMapping("/profile") @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<ApiResponse<PatientResponse>> update(@RequestBody PatientProfileRequest req,
            @AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(ApiResponse.success(patientService.createOrUpdateProfile(req, uid(ud)), "Profile updated"));
    }
    @PostMapping("/rate") @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<ApiResponse<Void>> rate(@Valid @RequestBody RatingRequest req,
            @AuthenticationPrincipal UserDetails ud) {
        ratingService.submitRating(req, uid(ud));
        return ResponseEntity.ok(ApiResponse.success(null, "Rating submitted!"));
    }

    /**
     * GET /api/patient/{id}/medical-history
     * Returns structured medical history summary + episodes grouped with their records + standalone records.
     * Accessible by patient (own data) and doctors (any patient they've treated).
     */
    @GetMapping("/{id}/medical-history")
    @PreAuthorize("hasAnyRole('PATIENT','DOCTOR')")
    public ResponseEntity<ApiResponse<MedicalHistoryTimelineResponse>> getMedicalHistory(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails ud) {

        // Authorization: patients can only view own history
        Long actingUserId = uid(ud);
        String actingRole = role(ud);
        if ("ROLE_PATIENT".equals(actingRole)) {
            var patient = patientRepo.findByUserId(actingUserId)
                    .orElseThrow(() -> new ResourceNotFoundException("Patient profile not found"));
            if (!patient.getId().equals(id)) {
                throw new BadRequestException("You can only view your own medical history.");
            }
        }

        // Sync medical history summary from patient profile
        patientService.syncMedicalHistorySummary(id);
        MedicalHistoryResponse summary = patientService.getStructuredHistory(id);

        // Load episodes directly by patient id (works for both patient and doctor roles)
        var episodes = episodeRepo.findByPatientIdOrderByStartDateDesc(id).stream()
                .map(e -> {
                    var records = medicalRecordService.getRecordsByEpisode(e.getId());
                    return MedicalHistoryTimelineResponse.EpisodeRecordsGroup.builder()
                            .episodeId(e.getId())
                            .episodeName(e.getEpisodeName())
                            .primaryDiagnosis(e.getPrimaryDiagnosis())
                            .conditionCategory(e.getConditionCategory())
                            .status(e.getStatus().name())
                            .startDate(e.getStartDate() != null ? e.getStartDate().toString() : null)
                            .endDate(e.getEndDate() != null ? e.getEndDate().toString() : null)
                            .records(records)
                            .build();
                }).toList();

        // Standalone records = records without any episode link
        var standalone = medicalRecordService.getPatientTimeline(actingUserId, actingRole, id).stream()
                .filter(r -> r.getEpisodeId() == null)
                .toList();

        return ResponseEntity.ok(ApiResponse.success(
                MedicalHistoryTimelineResponse.builder()
                        .summary(summary)
                        .episodes(episodes)
                        .standaloneRecords(standalone)
                        .build()));
    }

    private Long uid(UserDetails ud) { return userRepo.findByEmail(ud.getUsername()).orElseThrow().getId(); }
    private String role(UserDetails ud) { return ud.getAuthorities().isEmpty() ? "" : ud.getAuthorities().iterator().next().getAuthority(); }
}
