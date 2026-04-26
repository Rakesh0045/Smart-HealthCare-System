package com.healthcare.config;

import com.healthcare.entity.User;
import com.healthcare.enums.Role;
import com.healthcare.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
@RequiredArgsConstructor
@Slf4j
public class DataInitializer {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Bean
    public CommandLineRunner initData() {
        return args -> {
            // Create default admin if none exists
            if (!userRepository.existsByEmail("admin@healthcare.com")) {
                User admin = User.builder()
                        .name("System Admin")
                        .email("admin@healthcare.com")
                        .password(passwordEncoder.encode("password123"))
                        .phone("9000000001")
                        .role(Role.ADMIN)
                        .isActive(true)
                        .build();
                userRepository.save(admin);
                log.info("✅ Default admin created — admin@healthcare.com / password123");
            }

            // Create demo doctor if none exists
            if (!userRepository.existsByEmail("doctor@demo.com")) {
                User doctor = User.builder()
                        .name("Dr. Demo Doctor")
                        .email("doctor@demo.com")
                        .password(passwordEncoder.encode("password123"))
                        .phone("9000000010")
                        .role(Role.DOCTOR)
                        .isActive(true)
                        .build();
                userRepository.save(doctor);
                log.info("✅ Demo doctor created — doctor@demo.com / password123");
            }

            // Create demo patient if none exists
            if (!userRepository.existsByEmail("patient@demo.com")) {
                User patient = User.builder()
                        .name("Demo Patient")
                        .email("patient@demo.com")
                        .password(passwordEncoder.encode("password123"))
                        .phone("9000000020")
                        .role(Role.PATIENT)
                        .isActive(true)
                        .build();
                userRepository.save(patient);
                log.info("✅ Demo patient created — patient@demo.com / password123");
            }

            log.info("╔══════════════════════════════════════════════════╗");
            log.info("║        Smart Healthcare System — Ready!          ║");
            log.info("║  API:     http://localhost:8081/api               ║");
            log.info("║  Swagger: http://localhost:8081/swagger-ui.html   ║");
            log.info("║  Mode:    Notification=dev (console mock)         ║");
            log.info("╚══════════════════════════════════════════════════╝");
        };
    }
}
