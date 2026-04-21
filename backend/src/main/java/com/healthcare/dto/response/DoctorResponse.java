package com.healthcare.dto.response;
import lombok.*;
import java.util.List;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class DoctorResponse {
    private Long id;
    private Long userId;
    private String name;
    private String email;
    private String phone;
    private String specialization;
    private Integer experience;
    private Double consultationFee;
    private String bio;
    private String qualification;
    private String hospital;
    private Integer slotDuration;
    private Double rating;
    private Integer totalRatings;
    private Boolean isAvailable;
    private String profileImage;
    private List<AvailabilityResponse> availabilities;
}
