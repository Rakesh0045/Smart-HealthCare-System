package com.healthcare.dto.response;
import lombok.*;
import java.time.LocalDate;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class PatientResponse {
    private Long id;
    private Long userId;
    private String name;
    private String email;
    private String phone;
    private LocalDate dateOfBirth;
    private String bloodGroup;
    private String address;
    private String gender;
    private String allergies;
    private String emergencyContact;
    private String emergencyContactName;
    private String profileImage;
}
