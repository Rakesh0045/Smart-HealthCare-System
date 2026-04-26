package com.healthcare.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "prescription_medicines")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = "prescription")
@EqualsAndHashCode(exclude = "prescription")
public class PrescriptionMedicine {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "prescription_id", nullable = false)
    private Prescription prescription;

    @Column(name = "medicine_name", nullable = false, length = 100)
    private String medicineName;

    @Column(length = 50)
    private String dosage;      // e.g., "500mg"

    @Column(length = 100)
    private String frequency;   // e.g., "Twice a day"

    @Column(length = 50)
    private String duration;    // e.g., "7 days"

    @Column(columnDefinition = "TEXT")
    private String instructions; // e.g., "Take after meals"

    @Column(length = 50)
    private String type;         // e.g., "Tablet", "Syrup", "Injection"
}
