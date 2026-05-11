package com.healthcare.entity;

import com.healthcare.enums.FollowupType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "episode_followups", indexes = {
        @Index(name = "idx_followup_episode", columnList = "episode_id"),
        @Index(name = "idx_followup_appointment", columnList = "appointment_id")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = {"episode", "appointment"})
@EqualsAndHashCode(exclude = {"episode", "appointment"})
public class EpisodeFollowup {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "episode_id", nullable = false)
    private TreatmentEpisode episode;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "appointment_id", nullable = false)
    private Appointment appointment;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private FollowupType followupType = FollowupType.SCHEDULED;

    @Column(columnDefinition = "TEXT")
    private String followupPurpose;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
