package com.healthcare.dto.response;
import com.healthcare.enums.Role;
import lombok.*;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class AuthResponse {
    private String accessToken;
    private String refreshToken;
    private String tokenType;
    private Long userId;
    private String name;
    private String email;
    private Role role;
    private boolean profileComplete;
}
