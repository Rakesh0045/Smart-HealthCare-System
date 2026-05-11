package com.healthcare.entity;

import com.healthcare.enums.MedicalRecordType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "medical_records", indexes = {
        @Index(name = "idx_med_rec_patient", columnList = "patient_id"),
        @Index(name = "idx_med_rec_doctor", columnList = "doctor_id"),
        @Index(name = "idx_med_rec_type", columnList = "record_type"),
        @Index(name = "idx_med_rec_date", columnList = "record_date"),
        @Index(name = "idx_med_rec_episode", columnList = "episode_id")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = {"patient", "doctor", "appointment", "episode"})
@EqualsAndHashCode(exclude = {"patient", "doctor", "appointment", "episode"})
public class MedicalRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "patient_id", nullable = false)
    private Patient patient;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "doctor_id", nullable = false)
    private Doctor doctor;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "appointment_id")
    private Appointment appointment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "episode_id")
    private TreatmentEpisode episode;

    @Enumerated(EnumType.STRING)
    @Column(name = "record_type", nullable = false, length = 40)
    private MedicalRecordType recordType;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String summary;

    @Column(columnDefinition = "TEXT")
    private String details;

    @Column(name = "record_date", nullable = false)
    private LocalDate recordDate;

    @Column(name = "attachment_url", length = 500)
    private String attachmentUrl;

    @Column(name = "record_group_key", nullable = false, length = 36)
    private String recordGroupKey;

    @Column(name = "version_number", nullable = false)
    @Builder.Default
    private Integer versionNumber = 1;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
