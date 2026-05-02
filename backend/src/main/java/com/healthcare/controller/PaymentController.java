package com.healthcare.controller;

import com.healthcare.dto.request.PaymentVerifyRequest;
import com.healthcare.dto.response.ApiResponse;
import com.healthcare.repository.UserRepository;
import com.healthcare.service.PaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {
    private final PaymentService paymentService;
    private final UserRepository userRepo;

    @PostMapping("/create-order/{appointmentId}")
    @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<ApiResponse<Map<String, String>>> create(@PathVariable Long appointmentId,
            @AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity
                .ok(ApiResponse.success(paymentService.createOrder(appointmentId, uid(ud)), "Order created"));
    }

    @PostMapping("/verify")
    @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<ApiResponse<Void>> verify(@RequestBody PaymentVerifyRequest req,
            @AuthenticationPrincipal UserDetails ud) {
        paymentService.verifyPayment(req, uid(ud));
        return ResponseEntity.ok(ApiResponse.success(null, "Payment verified!"));
    }

    @PostMapping("/pay-at-appointment/{appointmentId}")
    @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<ApiResponse<Map<String, String>>> payAtAppointment(@PathVariable Long appointmentId,
            @AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(ApiResponse.success(
                paymentService.choosePayAtAppointment(appointmentId, uid(ud)),
                "Pay at appointment time selected"));
    }

    private Long uid(UserDetails ud) {
        return userRepo.findByEmail(ud.getUsername()).orElseThrow().getId();
    }
}
