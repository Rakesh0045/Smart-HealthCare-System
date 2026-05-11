package com.healthcare.controller;

import com.healthcare.dto.request.LinkRecordRequest;
import com.healthcare.dto.request.MedicalRecordRequest;
import com.healthcare.dto.response.ApiResponse;
import com.healthcare.dto.response.MedicalRecordResponse;
import com.healthcare.repository.UserRepository;
import com.healthcare.service.MedicalRecordService;
import com.healthcare.service.TreatmentEpisodeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/medical-records")
@RequiredArgsConstructor
public class MedicalRecordController {

    private final MedicalRecordService medicalRecordService;
    private final TreatmentEpisodeService episodeService;
    private final UserRepository userRepo;

    @PostMapping
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<ApiResponse<MedicalRecordResponse>> create(
            @Valid @RequestBody MedicalRecordRequest req,
            @AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(ApiResponse.success(
                medicalRecordService.createRecord(req, uid(ud)),
                "Medical record added"));
    }

    @GetMapping("/my")
    @PreAuthorize("hasAnyRole('PATIENT','DOCTOR')")
    public ResponseEntity<ApiResponse<List<MedicalRecordResponse>>> my(@AuthenticationPrincipal UserDetails ud) {
        Long userId = uid(ud);
        String role = role(ud);
        return ResponseEntity.ok(ApiResponse.success(medicalRecordService.getMyRecords(userId, role)));
    }

    @GetMapping("/patient/{patientId}")
    @PreAuthorize("hasAnyRole('PATIENT','DOCTOR')")
    public ResponseEntity<ApiResponse<List<MedicalRecordResponse>>> patientTimeline(
            @PathVariable Long patientId,
            @AuthenticationPrincipal UserDetails ud) {
        Long userId = uid(ud);
        String role = role(ud);
        return ResponseEntity.ok(ApiResponse.success(medicalRecordService.getPatientTimeline(userId, role, patientId)));
    }

    /**
     * PATCH /api/medical-records/{id}/link
     * Links a medical record to a treatment episode. Doctor or Patient.
     * Body: { "episodeId": 123 }
     */
    @PatchMapping("/{id}/link")
    @PreAuthorize("hasAnyRole('DOCTOR', 'PATIENT')")
    public ResponseEntity<ApiResponse<MedicalRecordResponse>> linkToEpisode(
            @PathVariable Long id,
            @RequestBody LinkRecordRequest req,
            @AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(ApiResponse.success(
                episodeService.linkRecordToEpisode(id, req.getEpisodeId(), uid(ud)),
                "Record linked to episode"));
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
