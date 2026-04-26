package com.healthcare.dto.request;
import lombok.Data;
import java.time.LocalDate;

@Data
public class PatientProfileRequest {
    private LocalDate dateOfBirth;
    private String bloodGroup;
    private String address;
    private String emergencyContact;
    private String emergencyContactName;
    private String allergies;
    private String gender;
}
