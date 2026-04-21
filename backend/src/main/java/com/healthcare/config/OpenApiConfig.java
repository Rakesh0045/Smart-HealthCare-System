package com.healthcare.config;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeIn;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.info.Contact;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import io.swagger.v3.oas.annotations.servers.Server;
import org.springframework.context.annotation.Configuration;

@Configuration
@OpenAPIDefinition(
    info = @Info(
        title        = "Smart Healthcare Management System API",
        version      = "1.0.0",
        description  = "Complete REST API for Healthcare Management — Appointments, Prescriptions, Payments, AI Symptom Checker",
        contact      = @Contact(name = "SmartHealth Team", email = "support@smarthealthcare.com")
    ),
    servers = {
        @Server(url = "http://localhost:8081", description = "Local Development Server")
    }
)
@SecurityScheme(
    name         = "Bearer Authentication",
    type         = SecuritySchemeType.HTTP,
    bearerFormat = "JWT",
    scheme       = "bearer",
    in           = SecuritySchemeIn.HEADER,
    description  = "Enter your JWT access token. Get it from POST /api/auth/login"
)
public class OpenApiConfig {
}
