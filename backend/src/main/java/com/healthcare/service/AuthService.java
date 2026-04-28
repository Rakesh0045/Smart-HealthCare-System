package com.healthcare.service;

import com.healthcare.dto.request.LoginRequest;
import com.healthcare.dto.request.RegisterRequest;
import com.healthcare.dto.request.VerifyEmailRequest;
import com.healthcare.dto.response.AuthResponse;
import com.healthcare.entity.EmailVerificationToken;
import com.healthcare.entity.RefreshToken;
import com.healthcare.entity.User;
import com.healthcare.enums.Role;
import com.healthcare.exception.BadRequestException;
import com.healthcare.exception.ConflictException;
import com.healthcare.exception.ResourceNotFoundException;
import com.healthcare.repository.EmailVerificationTokenRepository;
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
import java.time.LocalDateTime;
import java.util.Random;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final EmailVerificationTokenRepository emailVerificationTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider tokenProvider;
    private final AuditLogService auditLogService;
    private final NotificationService notificationService;

    @Value("${app.jwt.refresh-expiration}")
    private long refreshExpiration;

    @Value("${app.auth.verification-otp-expiration-minutes:15}")
    private long otpExpirationMinutes;

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
                .isActive(false)
                .build();

        user = userRepository.save(user);
        auditLogService.log(user.getId(), "USER_REGISTERED", "User", user.getId(),
                "New " + user.getRole() + " registered: " + user.getEmail());

        String otp = generateOtp();
        emailVerificationTokenRepository.deleteByUserId(user.getId());
        emailVerificationTokenRepository.save(EmailVerificationToken.builder()
                .user(user)
                .token(otp)
                .expiresAt(LocalDateTime.now().plusMinutes(otpExpirationMinutes))
                .build());
        notificationService.sendVerificationOtp(user, otp);

        return buildAuthResponse(user, null, null, false, true);
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (!Boolean.TRUE.equals(user.getIsActive())) {
            throw new BadRequestException("Please verify your email before logging in.");
        }

        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword()));

        String accessToken = tokenProvider.generateToken(authentication);
        String refreshToken = createRefreshToken(user);

        auditLogService.log(user.getId(), "USER_LOGIN", "User", user.getId(), "User logged in");

        boolean profileComplete = isProfileComplete(user);
        return buildAuthResponse(user, accessToken, refreshToken, profileComplete, false);
    }

    @Transactional
    public AuthResponse verifyEmail(VerifyEmailRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        EmailVerificationToken token = emailVerificationTokenRepository.findByUserId(user.getId())
                .orElseThrow(() -> new BadRequestException("Verification code not found. Please resend it."));

        if (token.getVerifiedAt() != null) {
            throw new BadRequestException("Email is already verified.");
        }
        if (token.getExpiresAt().isBefore(LocalDateTime.now())) {
            emailVerificationTokenRepository.delete(token);
            throw new BadRequestException("Verification code expired. Please request a new one.");
        }
        if (!token.getToken().equals(request.getOtp().trim())) {
            throw new BadRequestException("Invalid verification code.");
        }

        user.setActive(true);
        userRepository.save(user);
        token.setVerifiedAt(LocalDateTime.now());
        emailVerificationTokenRepository.save(token);

        String accessToken = tokenProvider.generateTokenFromUsername(user.getEmail());
        String refreshToken = createRefreshToken(user);

        notificationService.sendVerificationSuccessEmail(user);
        return buildAuthResponse(user, accessToken, refreshToken, isProfileComplete(user), false);
    }

    @Transactional
    public void resendVerificationOtp(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        if (Boolean.TRUE.equals(user.getIsActive())) {
            throw new BadRequestException("Email is already verified.");
        }

        String otp = generateOtp();
        emailVerificationTokenRepository.deleteByUserId(user.getId());
        emailVerificationTokenRepository.save(EmailVerificationToken.builder()
                .user(user)
                .token(otp)
                .expiresAt(LocalDateTime.now().plusMinutes(otpExpirationMinutes))
                .build());
        notificationService.sendVerificationOtp(user, otp);
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
        return buildAuthResponse(user, newAccessToken, token, isProfileComplete(user), false);
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
            String refreshToken, boolean profileComplete,
            boolean verificationRequired) {
        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .userId(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole())
                .profileComplete(profileComplete)
                .verificationRequired(verificationRequired)
                .build();
    }

    private String generateOtp() {
        return String.format("%06d", new Random().nextInt(1_000_000));
    }
}
