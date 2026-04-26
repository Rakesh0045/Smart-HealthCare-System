package com.healthcare.controller;
import com.healthcare.dto.request.*;
import com.healthcare.dto.response.*;
import com.healthcare.repository.UserRepository;
import com.healthcare.service.DoctorService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.List;

@RestController @RequiredArgsConstructor
public class DoctorController {
    private final DoctorService doctorService;
    private final UserRepository userRepo;

    @GetMapping("/api/doctors")
    public ResponseEntity<ApiResponse<List<DoctorResponse>>> getAll() {
        return ResponseEntity.ok(ApiResponse.success(doctorService.getAllDoctors()));
    }
    @GetMapping("/api/doctors/search")
    public ResponseEntity<ApiResponse<List<DoctorResponse>>> search(
            @RequestParam(required=false) String specialization,
            @RequestParam(required=false) Double maxFee,
            @RequestParam(required=false) String name) {
        return ResponseEntity.ok(ApiResponse.success(doctorService.searchDoctors(specialization, maxFee, name)));
    }
    @GetMapping("/api/doctors/specializations")
    public ResponseEntity<ApiResponse<List<String>>> specializations() {
        return ResponseEntity.ok(ApiResponse.success(doctorService.getAllSpecializations()));
    }
    @GetMapping("/api/doctors/{id}")
    public ResponseEntity<ApiResponse<DoctorResponse>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(doctorService.getDoctorById(id)));
    }
    @GetMapping("/api/doctors/{id}/slots")
    public ResponseEntity<ApiResponse<List<SlotResponse>>> slots(@PathVariable Long id,
            @RequestParam @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(ApiResponse.success(doctorService.getAvailableSlots(id, date)));
    }
    @GetMapping("/api/doctor/profile")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<ApiResponse<DoctorResponse>> myProfile(@AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(ApiResponse.success(doctorService.getDoctorProfile(uid(ud))));
    }
    @PostMapping("/api/doctor/profile")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<ApiResponse<DoctorResponse>> updateProfile(@Valid @RequestBody DoctorProfileRequest req,
            @AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(ApiResponse.success(doctorService.createOrUpdateProfile(req, uid(ud)), "Profile updated"));
    }
    @PostMapping("/api/doctor/availability")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<ApiResponse<List<AvailabilityResponse>>> setAvailability(
            @RequestBody List<AvailabilityRequest> reqs, @AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(ApiResponse.success(doctorService.setAvailability(uid(ud), reqs), "Availability updated"));
    }
    @PatchMapping("/api/doctor/toggle-availability")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<ApiResponse<Void>> toggle(@AuthenticationPrincipal UserDetails ud) {
        doctorService.toggleAvailability(uid(ud));
        return ResponseEntity.ok(ApiResponse.success(null, "Availability toggled"));
    }
    private Long uid(UserDetails ud) { return userRepo.findByEmail(ud.getUsername()).orElseThrow().getId(); }
}
