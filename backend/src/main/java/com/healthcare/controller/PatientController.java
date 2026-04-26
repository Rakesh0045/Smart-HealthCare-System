package com.healthcare.controller;
import com.healthcare.dto.request.*;
import com.healthcare.dto.response.*;
import com.healthcare.repository.UserRepository;
import com.healthcare.service.*;
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
    private Long uid(UserDetails ud) { return userRepo.findByEmail(ud.getUsername()).orElseThrow().getId(); }
}
