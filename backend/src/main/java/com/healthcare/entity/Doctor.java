package com.healthcare.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.List;

@Entity
@Table(name = "doctors")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(exclude = {"availabilities", "appointments"})
@ToString(exclude = {"availabilities", "appointments"})
public class Doctor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(nullable = false, length = 100)
    private String specialization;

    @Column(nullable = false)
    private Integer experience; // years

    @Column(name = "consultation_fee", nullable = false)
    private Double consultationFee;

    @Column(columnDefinition = "TEXT")
    private String bio;

    @Column(length = 200)
    private String qualification;

    @Column(length = 200)
    private String hospital;

    @Column(name = "slot_duration")
    @Builder.Default
    private Integer slotDuration = 30; // minutes

    @Column
    @Builder.Default
    private Double rating = 0.0;

    @Column(name = "total_ratings")
    @Builder.Default
    private Integer totalRatings = 0;

    @Column(name = "is_available")
    @Builder.Default
    private Boolean isAvailable = true;

    @OneToMany(mappedBy = "doctor", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<DoctorAvailability> availabilities;
}
