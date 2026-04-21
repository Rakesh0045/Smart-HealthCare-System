package com.healthcare.controller;
import com.healthcare.dto.request.PrescriptionRequest;
import com.healthcare.dto.response.*;
import com.healthcare.repository.UserRepository;
import com.healthcare.service.PrescriptionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController @RequestMapping("/api/prescriptions") @RequiredArgsConstructor
public class PrescriptionController {
    private final PrescriptionService prescriptionService;
    private final UserRepository userRepo;

    @PostMapping @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<ApiResponse<PrescriptionResponse>> add(@Valid @RequestBody PrescriptionRequest req,
            @AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(ApiResponse.success(prescriptionService.addPrescription(req, uid(ud)), "Prescription added"));
    }
    @GetMapping("/my")
    public ResponseEntity<ApiResponse<List<PrescriptionResponse>>> getMy(@AuthenticationPrincipal UserDetails ud) {
        Long userId = uid(ud);
        String role = ud.getAuthorities().iterator().next().getAuthority();
        List<PrescriptionResponse> list = role.equals("ROLE_DOCTOR")
                ? prescriptionService.getDoctorPrescriptions(userId)
                : prescriptionService.getPatientPrescriptions(userId);
        return ResponseEntity.ok(ApiResponse.success(list));
    }
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<PrescriptionResponse>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(prescriptionService.getPrescription(id)));
    }
    @GetMapping("/appointment/{appointmentId}")
    public ResponseEntity<ApiResponse<PrescriptionResponse>> byAppointment(@PathVariable Long appointmentId) {
        return ResponseEntity.ok(ApiResponse.success(prescriptionService.getPrescriptionByAppointment(appointmentId)));
    }
    @GetMapping("/{id}/download")
    public ResponseEntity<byte[]> download(@PathVariable Long id) {
        byte[] pdf = prescriptionService.generatePrescriptionPdf(id);
        HttpHeaders h = new HttpHeaders();
        h.setContentType(MediaType.APPLICATION_PDF);
        h.setContentDisposition(ContentDisposition.attachment().filename("prescription-"+id+".pdf").build());
        return new ResponseEntity<>(pdf, h, HttpStatus.OK);
    }
    private Long uid(UserDetails ud) { return userRepo.findByEmail(ud.getUsername()).orElseThrow().getId(); }
}
