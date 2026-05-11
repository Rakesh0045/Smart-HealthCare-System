package com.healthcare.entity;

import com.healthcare.enums.EpisodeStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "treatment_episodes", indexes = {
        @Index(name = "idx_episode_patient", columnList = "patient_id"),
        @Index(name = "idx_episode_doctor", columnList = "doctor_id"),
        @Index(name = "idx_episode_status", columnList = "status"),
        @Index(name = "idx_episode_primary_appt", columnList = "primary_appointment_id")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = {"patient", "doctor", "primaryAppointment", "followups"})
@EqualsAndHashCode(exclude = {"patient", "doctor", "primaryAppointment", "followups"})
public class TreatmentEpisode {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "patient_id", nullable = false)
    private Patient patient;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "doctor_id", nullable = false)
    private Doctor doctor;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "primary_appointment_id", nullable = false)
    private Appointment primaryAppointment;

    @Column(length = 200)
    private String episodeName;

    @Column(length = 500)
    private String primaryDiagnosis;

    @Column(length = 100)
    private String conditionCategory;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private EpisodeStatus status = EpisodeStatus.ACTIVE;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(name = "ai_lifestyle_advice", columnDefinition = "TEXT")
    private String aiLifestyleAdvice;

    @Column(name = "ai_generated_at")
    private LocalDateTime aiGeneratedAt;

    @OneToMany(mappedBy = "episode", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private java.util.List<EpisodeFollowup> followups = new java.util.ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
