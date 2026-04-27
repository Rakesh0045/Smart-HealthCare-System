package com.healthcare.controller;

import com.healthcare.dto.request.AppointmentRequest;
import com.healthcare.dto.request.CancelAppointmentRequest;
import com.healthcare.dto.response.*;
import com.healthcare.repository.UserRepository;
import com.healthcare.service.AppointmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.*;

@RestController
@RequestMapping("/api/appointments")
@RequiredArgsConstructor
public class AppointmentController {
    private final AppointmentService appointmentService;
    private final UserRepository userRepo;

    @PostMapping
    @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<ApiResponse<AppointmentResponse>> book(@Valid @RequestBody AppointmentRequest req,
            @AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity
                .ok(ApiResponse.success(appointmentService.bookAppointment(req, uid(ud)), "Appointment booked!"));
    }

    @GetMapping("/my")
    public ResponseEntity<ApiResponse<List<AppointmentResponse>>> getMy(@AuthenticationPrincipal UserDetails ud) {
        Long userId = uid(ud);
        String role = ud.getAuthorities().iterator().next().getAuthority();
        List<AppointmentResponse> list = role.equals("ROLE_DOCTOR")
                ? appointmentService.getDoctorAppointments(userId)
                : appointmentService.getPatientAppointments(userId);
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    @GetMapping("/doctor/today")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<ApiResponse<List<AppointmentResponse>>> doctorByDate(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(ApiResponse.success(appointmentService.getDoctorAppointmentsByDate(uid(ud), date)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<AppointmentResponse>> getById(@PathVariable Long id,
            @AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(ApiResponse.success(appointmentService.getAppointmentById(id, uid(ud))));
    }

    @DeleteMapping("/{id}/cancel")
    public ResponseEntity<ApiResponse<AppointmentResponse>> cancel(@PathVariable Long id,
            @RequestBody(required = false) CancelAppointmentRequest req,
            @AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity
                .ok(ApiResponse.success(appointmentService.cancelAppointment(id, uid(ud), req), "Cancelled"));
    }

    @PutMapping("/{id}/reschedule")
    @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<ApiResponse<AppointmentResponse>> reschedule(@PathVariable Long id,
            @Valid @RequestBody AppointmentRequest req, @AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity
                .ok(ApiResponse.success(appointmentService.rescheduleAppointment(id, req, uid(ud)), "Rescheduled"));
    }

    @PatchMapping("/{id}/complete")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<ApiResponse<AppointmentResponse>> complete(@PathVariable Long id,
            @RequestBody Map<String, Object> body, @AuthenticationPrincipal UserDetails ud) {
        Object paymentCollected = body.get("paymentCollected");
        return ResponseEntity.ok(ApiResponse.success(
                appointmentService.completeAppointment(id, String.valueOf(body.getOrDefault("doctorNotes", "")),
                        paymentCollected instanceof Boolean
                                ? (Boolean) paymentCollected
                                : Boolean.valueOf(String.valueOf(paymentCollected)),
                        uid(ud)),
                "Completed"));
    }

    @PatchMapping("/{id}/no-show")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<ApiResponse<AppointmentResponse>> markNoShow(@PathVariable Long id,
            @AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(ApiResponse.success(
                appointmentService.markAsNoShow(id, uid(ud)), "Marked as no-show"));
    }

    private Long uid(UserDetails ud) {
        return userRepo.findByEmail(ud.getUsername()).orElseThrow().getId();
    }
}
