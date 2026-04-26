package com.healthcare;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@SpringBootApplication
@EnableScheduling
@EnableAsync
@EnableJpaAuditing
public class HealthcareApplication {
    public static void main(String[] args) {
        SpringApplication.run(HealthcareApplication.class, args);
        System.out.println("╔════════════════════════════════════════════════════╗");
        System.out.println("║  Smart Healthcare Management System                ║");
        System.out.println("║  Server running on: http://localhost:8081          ║");
        System.out.println("║  Swagger UI: http://localhost:8081/swagger-ui.html ║");
        System.out.println("╚════════════════════════════════════════════════════╝");
    }
}
