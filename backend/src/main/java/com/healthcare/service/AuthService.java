package com.healthcare.service;

import com.healthcare.dto.request.LoginRequest;
import com.healthcare.dto.request.RegisterRequest;
import com.healthcare.dto.response.AuthResponse;
import com.healthcare.entity.RefreshToken;
import com.healthcare.entity.User;
import com.healthcare.enums.Role;
import com.healthcare.exception.BadRequestException;
import com.healthcare.exception.ConflictException;
import com.healthcare.exception.ResourceNotFoundException;
import com.healthcare.repository.RefreshTokenRepository;
import com.healthcare.repository.UserRepository;
import com.healthcare.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider tokenProvider;
    private final AuditLogService auditLogService;

    @Value("${app.jwt.refresh-expiration}")
    private long refreshExpiration;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new ConflictException("Email already registered: " + request.getEmail());
        }

        User user = User.builder()
                .name(request.getName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .phone(request.getPhone())
                .role(request.getRole())
                .isActive(true)
                .build();

        user = userRepository.save(user);
        auditLogService.log(user.getId(), "USER_REGISTERED", "User", user.getId(),
                "New " + user.getRole() + " registered: " + user.getEmail());

        String accessToken = tokenProvider.generateTokenFromUsername(user.getEmail());
        String refreshToken = createRefreshToken(user);

        return buildAuthResponse(user, accessToken, refreshToken, false);
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
        );

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        String accessToken = tokenProvider.generateToken(authentication);
        String refreshToken = createRefreshToken(user);

        auditLogService.log(user.getId(), "USER_LOGIN", "User", user.getId(), "User logged in");

        boolean profileComplete = isProfileComplete(user);
        return buildAuthResponse(user, accessToken, refreshToken, profileComplete);
    }

    @Transactional
    public AuthResponse refreshToken(String token) {
        RefreshToken refreshToken = refreshTokenRepository.findByToken(token)
                .orElseThrow(() -> new BadRequestException("Invalid refresh token"));

        if (refreshToken.getExpiryDate().isBefore(Instant.now())) {
            refreshTokenRepository.delete(refreshToken);
            throw new BadRequestException("Refresh token expired. Please login again.");
        }

        User user = refreshToken.getUser();
        String newAccessToken = tokenProvider.generateTokenFromUsername(user.getEmail());
        return buildAuthResponse(user, newAccessToken, token, isProfileComplete(user));
    }

    @Transactional
    public void logout(Long userId) {
        refreshTokenRepository.deleteByUserId(userId);
        auditLogService.log(userId, "USER_LOGOUT", "User", userId, "User logged out");
    }

    private String createRefreshToken(User user) {
        refreshTokenRepository.deleteByUserId(user.getId());
        RefreshToken token = RefreshToken.builder()
                .user(user)
                .token(UUID.randomUUID().toString())
                .expiryDate(Instant.now().plusMillis(refreshExpiration))
                .build();
        return refreshTokenRepository.save(token).getToken();
    }

    private boolean isProfileComplete(User user) {
        if (user.getRole() == Role.PATIENT || user.getRole() == Role.DOCTOR) {
            return user.getPhone() != null && !user.getPhone().isEmpty();
        }
        return true;
    }

    private AuthResponse buildAuthResponse(User user, String accessToken,
                                            String refreshToken, boolean profileComplete) {
        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .userId(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole())
                .profileComplete(profileComplete)
                .build();
    }
}
