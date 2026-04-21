package com.healthcare.controller;
import com.healthcare.dto.response.*;
import com.healthcare.entity.*;
import com.healthcare.exception.ResourceNotFoundException;
import com.healthcare.repository.UserRepository;
import com.healthcare.service.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController @RequestMapping("/api/admin") @PreAuthorize("hasRole('ADMIN')") @RequiredArgsConstructor
public class AdminController {
    private final AdminService adminService;
    private final DoctorService doctorService;
    private final PatientService patientService;
    private final AuditLogService auditLogService;
    private final UserRepository userRepo;

    @GetMapping("/dashboard")
    public ResponseEntity<ApiResponse<DashboardStatsResponse>> dashboard() {
        return ResponseEntity.ok(ApiResponse.success(adminService.getDashboardStats()));
    }
    @GetMapping("/doctors")
    public ResponseEntity<ApiResponse<List<DoctorResponse>>> doctors() {
        return ResponseEntity.ok(ApiResponse.success(doctorService.getAllDoctors()));
    }
    @GetMapping("/patients")
    public ResponseEntity<ApiResponse<List<PatientResponse>>> patients() {
        return ResponseEntity.ok(ApiResponse.success(patientService.getAllPatients()));
    }
    @GetMapping("/users")
    public ResponseEntity<ApiResponse<List<User>>> users() {
        return ResponseEntity.ok(ApiResponse.success(userRepo.findAll()));
    }
    @DeleteMapping("/users/{id}")
    public ResponseEntity<ApiResponse<Void>> deactivate(@PathVariable Long id) {
        User u = userRepo.findById(id).orElseThrow(() -> new ResourceNotFoundException("User", id));
        u.setActive(false); userRepo.save(u);
        return ResponseEntity.ok(ApiResponse.success(null, "Deactivated"));
    }
    @PatchMapping("/users/{id}/activate")
    public ResponseEntity<ApiResponse<Void>> activate(@PathVariable Long id) {
        User u = userRepo.findById(id).orElseThrow(() -> new ResourceNotFoundException("User", id));
        u.setActive(true); userRepo.save(u);
        return ResponseEntity.ok(ApiResponse.success(null, "Activated"));
    }
    @GetMapping("/audit-logs")
    public ResponseEntity<ApiResponse<Page<AuditLog>>> logs(
            @RequestParam(defaultValue="0") int page, @RequestParam(defaultValue="20") int size) {
        return ResponseEntity.ok(ApiResponse.success(auditLogService.getAll(
                PageRequest.of(page, size, Sort.by("createdAt").descending()))));
    }
}
