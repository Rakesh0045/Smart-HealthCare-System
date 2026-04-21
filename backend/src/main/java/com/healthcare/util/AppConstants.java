package com.healthcare.util;

public final class AppConstants {
    private AppConstants() {}

    public static final int DEFAULT_SLOT_DURATION_MINUTES = 30;
    public static final int MAX_ADVANCE_BOOKING_DAYS = 30;
    public static final int MIN_BOOKING_BUFFER_MINUTES = 30;
    public static final int MAX_CANCELLATION_HOURS_BEFORE = 2;

    // Pagination
    public static final int DEFAULT_PAGE_SIZE = 20;
    public static final int MAX_PAGE_SIZE = 100;

    // JWT
    public static final String TOKEN_PREFIX = "Bearer ";
    public static final String HEADER_STRING = "Authorization";

    // Roles
    public static final String ROLE_PATIENT = "ROLE_PATIENT";
    public static final String ROLE_DOCTOR  = "ROLE_DOCTOR";
    public static final String ROLE_ADMIN   = "ROLE_ADMIN";
}
