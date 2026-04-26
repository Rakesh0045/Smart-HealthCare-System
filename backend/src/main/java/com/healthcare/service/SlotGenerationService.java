package com.healthcare.service;

import com.healthcare.dto.response.SlotResponse;
import com.healthcare.entity.Appointment;
import com.healthcare.entity.DoctorAvailability;
import com.healthcare.enums.DayOfWeekEnum;
import com.healthcare.repository.AppointmentRepository;
import com.healthcare.repository.DoctorAvailabilityRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class SlotGenerationService {

    private final DoctorAvailabilityRepository availabilityRepo;
    private final AppointmentRepository appointmentRepo;

    private static final DateTimeFormatter TIME_FORMAT = DateTimeFormatter.ofPattern("hh:mm a");

    /**
     * Generates available time slots for a doctor on a specific date.
     * Logic:
     * 1. Get doctor's availability for the day of week
     * 2. Generate all 30-min slots within that window
     * 3. Exclude break time slots
     * 4. Exclude already booked slots
     * 5. Exclude past slots (if today)
     */
    public List<SlotResponse> getAvailableSlots(Long doctorId, LocalDate date, int slotDurationMinutes) {
        DayOfWeekEnum dayOfWeek = DayOfWeekEnum.valueOf(date.getDayOfWeek().name());
        Optional<DoctorAvailability> availabilityOpt =
                availabilityRepo.findByDoctorIdAndDayOfWeek(doctorId, dayOfWeek);

        if (availabilityOpt.isEmpty() || !Boolean.TRUE.equals(availabilityOpt.get().getIsAvailable())) {
            return List.of(); // Doctor not available this day
        }

        DoctorAvailability availability = availabilityOpt.get();

        // Get booked slots for this doctor on this date
        List<Appointment> bookedAppointments = appointmentRepo
                .findByDoctorIdAndAppointmentDate(doctorId, date);

        List<LocalTime[]> bookedSlots = bookedAppointments.stream()
                .map(a -> new LocalTime[]{a.getStartTime(), a.getEndTime()})
                .toList();

        // Generate all possible slots
        List<SlotResponse> slots = new ArrayList<>();
        LocalTime currentSlot = availability.getStartTime();
        LocalTime now = LocalTime.now();
        boolean isToday = date.equals(LocalDate.now());

        while (currentSlot.plusMinutes(slotDurationMinutes).compareTo(availability.getEndTime()) <= 0) {
            LocalTime slotEnd = currentSlot.plusMinutes(slotDurationMinutes);

            // Skip past slots if date is today (with 30 min buffer)
            if (isToday && currentSlot.isBefore(now.plusMinutes(30))) {
                currentSlot = slotEnd;
                continue;
            }

            // Skip break time
            if (isInBreak(currentSlot, slotEnd, availability)) {
                currentSlot = slotEnd;
                continue;
            }

            // Check if slot is booked
            boolean isBooked = isSlotBooked(currentSlot, slotEnd, bookedSlots);

            slots.add(SlotResponse.builder()
                    .startTime(currentSlot)
                    .endTime(slotEnd)
                    .available(!isBooked)
                    .displayTime(currentSlot.format(TIME_FORMAT) + " - " + slotEnd.format(TIME_FORMAT))
                    .build());

            currentSlot = slotEnd;
        }

        return slots;
    }

    /**
     * Returns ONLY available (not booked) slots — used for booking form.
     */
    public List<SlotResponse> getOnlyAvailableSlots(Long doctorId, LocalDate date, int slotDurationMinutes) {
        return getAvailableSlots(doctorId, date, slotDurationMinutes)
                .stream()
                .filter(SlotResponse::isAvailable)
                .toList();
    }

    /**
     * Validates if a specific slot is still available (used before booking).
     */
    public boolean isSlotAvailable(Long doctorId, LocalDate date,
                                    LocalTime startTime, LocalTime endTime) {
        // Check for conflicts
        List<Appointment> conflicts = appointmentRepo
                .findConflictingAppointments(doctorId, date, startTime, endTime);
        if (!conflicts.isEmpty()) return false;

        // Check doctor availability on that day
        DayOfWeekEnum dayOfWeek = DayOfWeekEnum.valueOf(date.getDayOfWeek().name());
        Optional<DoctorAvailability> availOpt = availabilityRepo
                .findByDoctorIdAndDayOfWeek(doctorId, dayOfWeek);
        if (availOpt.isEmpty() || !Boolean.TRUE.equals(availOpt.get().getIsAvailable())) return false;

        DoctorAvailability avail = availOpt.get();
        // Check slot is within doctor's working hours
        if (startTime.isBefore(avail.getStartTime()) || endTime.isAfter(avail.getEndTime())) return false;

        // Check not in break time
        if (isInBreak(startTime, endTime, avail)) return false;

        // Check not in past
        if (date.isBefore(LocalDate.now())) return false;
        if (date.equals(LocalDate.now()) && startTime.isBefore(LocalTime.now().plusMinutes(30))) return false;

        return true;
    }

    private boolean isInBreak(LocalTime slotStart, LocalTime slotEnd, DoctorAvailability avail) {
        if (avail.getBreakStart() == null || avail.getBreakEnd() == null) return false;
        return slotStart.isBefore(avail.getBreakEnd()) && slotEnd.isAfter(avail.getBreakStart());
    }

    private boolean isSlotBooked(LocalTime slotStart, LocalTime slotEnd, List<LocalTime[]> bookedSlots) {
        for (LocalTime[] booked : bookedSlots) {
            if (slotStart.isBefore(booked[1]) && slotEnd.isAfter(booked[0])) {
                return true;
            }
        }
        return false;
    }
}
