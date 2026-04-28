package com.healthcare.service;

import com.healthcare.dto.request.AvailabilityRequest;
import com.healthcare.dto.request.DoctorProfileRequest;
import com.healthcare.dto.response.AvailabilityResponse;
import com.healthcare.dto.response.DoctorResponse;
import com.healthcare.dto.response.SlotResponse;
import com.healthcare.entity.*;
import com.healthcare.enums.AppointmentStatus;
import com.healthcare.exception.*;
import com.healthcare.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class DoctorService {

    private final DoctorRepository doctorRepo;
    private final UserRepository userRepo;
    private final DoctorAvailabilityRepository availabilityRepo;
    private final AppointmentRepository appointmentRepo;
    private final SlotGenerationService slotService;
    private final NotificationService notificationService;
    private final AuditLogService auditLogService;

    @Value("${app.slot.duration-minutes:30}")
    private int defaultSlotDuration;

    @Transactional
    public DoctorResponse createOrUpdateProfile(DoctorProfileRequest req, Long userId) {
        User user = userRepo.findById(userId).orElseThrow(() -> new ResourceNotFoundException("User", userId));
        Doctor doctor = doctorRepo.findByUserId(userId).orElse(Doctor.builder().user(user).build());
        doctor.setSpecialization(req.getSpecialization());
        doctor.setExperience(req.getExperience());
        doctor.setConsultationFee(req.getConsultationFee());
        doctor.setBio(req.getBio());
        doctor.setQualification(req.getQualification());
        doctor.setHospital(req.getHospital());
        doctor.setSlotDuration(req.getSlotDuration() != null ? req.getSlotDuration() : defaultSlotDuration);
        doctor = doctorRepo.save(doctor);
        auditLogService.log(userId, "DOCTOR_PROFILE_UPDATED", "Doctor", doctor.getId(), "Profile updated");
        return mapToResponse(doctor);
    }

    @Transactional(readOnly = true)
    public DoctorResponse getDoctorProfile(Long userId) {
        Doctor doctor = doctorRepo.findByUserId(userId)
                .orElseThrow(
                        () -> new ResourceNotFoundException("Doctor profile not found. Please create your profile."));
        return mapToResponse(doctor);
    }

    @Transactional(readOnly = true)
    public DoctorResponse getDoctorById(Long doctorId) {
        return doctorRepo.findById(doctorId).map(this::mapToResponse)
                .orElseThrow(() -> new ResourceNotFoundException("Doctor", doctorId));
    }

    @Transactional(readOnly = true)
    public List<DoctorResponse> getAllDoctors() {
        return doctorRepo.findAll().stream().map(this::mapToResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<DoctorResponse> searchDoctors(String specialization, Double maxFee, String name) {
        return doctorRepo.searchDoctors(specialization, maxFee).stream()
                .filter(d -> name == null || d.getUser().getName().toLowerCase().contains(name.toLowerCase()))
                .map(this::mapToResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<String> getAllSpecializations() {
        return doctorRepo.findAllSpecializations();
    }

    @Transactional
    public List<AvailabilityResponse> setAvailability(Long userId, List<AvailabilityRequest> requests) {
        Doctor doctor = doctorRepo.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Doctor profile not found"));
        availabilityRepo.deleteByDoctorId(doctor.getId());
        List<DoctorAvailability> avails = requests.stream().map(r -> DoctorAvailability.builder()
                .doctor(doctor)
                .dayOfWeek(r.getDayOfWeek())
                .startTime(r.getStartTime())
                .endTime(r.getEndTime())
                .isAvailable(r.getIsAvailable())
                .breakStart(r.getBreakStart())
                .breakEnd(r.getBreakEnd())
                .build()).toList();
        availabilityRepo.saveAll(avails);
        return availabilityRepo.findByDoctorId(doctor.getId()).stream().map(this::mapAvailability).toList();
    }

    @Transactional(readOnly = true)
    public List<SlotResponse> getAvailableSlots(Long doctorId, LocalDate date) {
        Doctor doctor = doctorRepo.findById(doctorId)
                .orElseThrow(() -> new ResourceNotFoundException("Doctor", doctorId));
        return slotService.getOnlyAvailableSlots(doctorId, date, doctor.getSlotDuration());
    }

    @Transactional
    public void toggleAvailability(Long userId) {
        Doctor doctor = doctorRepo.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Doctor profile not found"));
        boolean nowAvailable = !Boolean.TRUE.equals(doctor.getIsAvailable());
        doctor.setIsAvailable(nowAvailable);
        doctorRepo.save(doctor);

        if (!nowAvailable) {
            LocalDate today = LocalDate.now();
            List<Appointment> affected = appointmentRepo.findByDoctorIdAndAppointmentDate(doctor.getId(), today)
                    .stream()
                    .filter(a -> a.getStatus() != AppointmentStatus.CANCELLED
                            && a.getStatus() != AppointmentStatus.COMPLETED)
                    .toList();
            notificationService.sendDoctorUnavailableNotification(affected, doctor.getUser().getName());
        }
    }

    public DoctorResponse mapToResponse(Doctor d) {
        List<AvailabilityResponse> avails = availabilityRepo.findByDoctorId(d.getId())
                .stream().map(this::mapAvailability).toList();
        return DoctorResponse.builder()
                .id(d.getId()).userId(d.getUser().getId())
                .name(d.getUser().getName()).email(d.getUser().getEmail())
                .phone(d.getUser().getPhone()).profileImage(d.getUser().getProfileImage())
                .specialization(d.getSpecialization()).experience(d.getExperience())
                .consultationFee(d.getConsultationFee()).bio(d.getBio())
                .qualification(d.getQualification()).hospital(d.getHospital())
                .slotDuration(d.getSlotDuration()).rating(d.getRating())
                .totalRatings(d.getTotalRatings()).isAvailable(d.getIsAvailable())
                .availabilities(avails).build();
    }

    private AvailabilityResponse mapAvailability(DoctorAvailability a) {
        return AvailabilityResponse.builder()
                .id(a.getId()).dayOfWeek(a.getDayOfWeek())
                .startTime(a.getStartTime()).endTime(a.getEndTime())
                .isAvailable(a.getIsAvailable())
                .breakStart(a.getBreakStart()).breakEnd(a.getBreakEnd()).build();
    }
}
