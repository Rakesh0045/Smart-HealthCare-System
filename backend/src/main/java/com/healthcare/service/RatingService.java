package com.healthcare.service;

import com.healthcare.dto.request.RatingRequest;
import com.healthcare.entity.*;
import com.healthcare.exception.*;
import com.healthcare.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.healthcare.enums.AppointmentStatus;

@Service
@RequiredArgsConstructor
public class RatingService {

    private final RatingRepository ratingRepo;
    private final AppointmentRepository appointmentRepo;
    private final PatientRepository patientRepo;
    private final DoctorRepository doctorRepo;

    @Transactional
    public void submitRating(RatingRequest req, Long userId) {
        Appointment appointment = appointmentRepo.findById(req.getAppointmentId())
                .orElseThrow(() -> new ResourceNotFoundException("Appointment", req.getAppointmentId()));
        if (!appointment.getPatient().getUser().getId().equals(userId))
            throw new BadRequestException("You can only rate your own appointments.");
        if (appointment.getStatus() != AppointmentStatus.COMPLETED)
            throw new BadRequestException("You can only rate completed appointments.");
        if (ratingRepo.findByAppointmentId(req.getAppointmentId()).isPresent())
            throw new ConflictException("You have already rated this appointment.");

        Rating rating = Rating.builder()
                .appointment(appointment).patient(appointment.getPatient())
                .doctor(appointment.getDoctor()).rating(req.getRating())
                .review(req.getReview()).build();
        ratingRepo.save(rating);
        updateDoctorRating(appointment.getDoctor());
    }

    private void updateDoctorRating(Doctor doctor) {
        Double avg = ratingRepo.getAverageRatingByDoctor(doctor.getId());
        long count = ratingRepo.countByDoctor(doctor.getId());
        doctor.setRating(avg != null ? Math.round(avg * 10.0) / 10.0 : 0.0);
        doctor.setTotalRatings((int) count);
        doctorRepo.save(doctor);
    }
}
