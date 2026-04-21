-- ============================================================
--  Smart Healthcare Management System — MySQL Schema + Seed
--  Port: 8081 | DB: healthcare_db
-- ============================================================

CREATE DATABASE IF NOT EXISTS healthcare_db
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE healthcare_db;

-- Users
CREATE TABLE IF NOT EXISTS users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(15),
    role ENUM('PATIENT','DOCTOR','ADMIN') NOT NULL,
    profile_image VARCHAR(200),
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_email (email),
    INDEX idx_user_role (role)
) ENGINE=InnoDB;

-- Refresh tokens
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE,
    token VARCHAR(500) NOT NULL UNIQUE,
    expiry_date DATETIME NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Doctors
CREATE TABLE IF NOT EXISTS doctors (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE,
    specialization VARCHAR(100) NOT NULL,
    experience INT NOT NULL,
    consultation_fee DOUBLE NOT NULL,
    bio TEXT,
    qualification VARCHAR(200),
    hospital VARCHAR(200),
    slot_duration INT DEFAULT 30,
    rating DECIMAL(3,2) DEFAULT 0.00,
    total_ratings INT DEFAULT 0,
    is_available BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Patients
CREATE TABLE IF NOT EXISTS patients (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE,
    date_of_birth DATE,
    blood_group VARCHAR(5),
    address TEXT,
    emergency_contact VARCHAR(15),
    emergency_contact_name VARCHAR(100),
    allergies TEXT,
    medical_history TEXT,
    gender VARCHAR(10),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Doctor Availability
CREATE TABLE IF NOT EXISTS doctor_availability (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    doctor_id BIGINT NOT NULL,
    day_of_week ENUM('MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY') NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    break_start TIME,
    break_end TIME,
    UNIQUE KEY unique_doctor_day (doctor_id, day_of_week),
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Appointments
CREATE TABLE IF NOT EXISTS appointments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    patient_id BIGINT NOT NULL,
    doctor_id BIGINT NOT NULL,
    appointment_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status ENUM('SCHEDULED','COMPLETED','CANCELLED','NO_SHOW','RESCHEDULED') DEFAULT 'SCHEDULED',
    reason TEXT,
    notes TEXT,
    doctor_notes TEXT,
    payment_status ENUM('PENDING','PAID','FAILED','REFUNDED') DEFAULT 'PENDING',
    is_first_visit BOOLEAN DEFAULT TRUE,
    reminder_sent BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_appointment_patient (patient_id),
    INDEX idx_appointment_doctor (doctor_id),
    INDEX idx_appointment_date (appointment_date),
    INDEX idx_appointment_status (status),
    FOREIGN KEY (patient_id) REFERENCES patients(id),
    FOREIGN KEY (doctor_id) REFERENCES doctors(id)
) ENGINE=InnoDB;

-- Prescriptions
CREATE TABLE IF NOT EXISTS prescriptions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    appointment_id BIGINT NOT NULL UNIQUE,
    doctor_id BIGINT NOT NULL,
    patient_id BIGINT NOT NULL,
    diagnosis TEXT NOT NULL,
    additional_notes TEXT,
    follow_up_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id),
    FOREIGN KEY (doctor_id) REFERENCES doctors(id),
    FOREIGN KEY (patient_id) REFERENCES patients(id)
) ENGINE=InnoDB;

-- Prescription Medicines
CREATE TABLE IF NOT EXISTS prescription_medicines (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    prescription_id BIGINT NOT NULL,
    medicine_name VARCHAR(100) NOT NULL,
    dosage VARCHAR(50),
    frequency VARCHAR(100),
    duration VARCHAR(50),
    instructions TEXT,
    type VARCHAR(50),
    FOREIGN KEY (prescription_id) REFERENCES prescriptions(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Payments
CREATE TABLE IF NOT EXISTS payments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    appointment_id BIGINT NOT NULL UNIQUE,
    amount DOUBLE NOT NULL,
    razorpay_order_id VARCHAR(100) UNIQUE,
    razorpay_payment_id VARCHAR(100),
    razorpay_signature VARCHAR(500),
    status ENUM('PENDING','PAID','FAILED','REFUNDED') DEFAULT 'PENDING',
    currency VARCHAR(10) DEFAULT 'INR',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id)
) ENGINE=InnoDB;

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type ENUM('APPOINTMENT_BOOKED','APPOINTMENT_CANCELLED','APPOINTMENT_REMINDER','APPOINTMENT_COMPLETED','PRESCRIPTION_ADDED','PAYMENT_SUCCESS','GENERAL') NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    reference_id BIGINT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_notification_user (user_id),
    INDEX idx_notification_read (is_read),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Ratings
CREATE TABLE IF NOT EXISTS ratings (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    appointment_id BIGINT NOT NULL UNIQUE,
    patient_id BIGINT NOT NULL,
    doctor_id BIGINT NOT NULL,
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    review TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id),
    FOREIGN KEY (patient_id) REFERENCES patients(id),
    FOREIGN KEY (doctor_id) REFERENCES doctors(id)
) ENGINE=InnoDB;

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id BIGINT,
    details TEXT,
    ip_address VARCHAR(50),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_audit_user (user_id),
    INDEX idx_audit_entity (entity_type, entity_id)
) ENGINE=InnoDB;

-- ============================================================
--  SEED DATA
--  Passwords are all: password123 (BCrypt hashed)
-- ============================================================

INSERT INTO users (name, email, password, phone, role, is_active) VALUES
-- Admin
('System Admin', 'admin@demo.com', '$2a$12$LcQKVR3QZRZ7PxL0m5R3/.rXz0GKJpwzp6vwB5B7BqCj9f3YLNO4q', '9000000000', 'ADMIN', TRUE),
-- Doctors
('Dr. Arjun Sharma', 'doctor@demo.com', '$2a$12$LcQKVR3QZRZ7PxL0m5R3/.rXz0GKJpwzp6vwB5B7BqCj9f3YLNO4q', '9000000001', 'DOCTOR', TRUE),
('Dr. Priya Mehta', 'priya@demo.com', '$2a$12$LcQKVR3QZRZ7PxL0m5R3/.rXz0GKJpwzp6vwB5B7BqCj9f3YLNO4q', '9000000002', 'DOCTOR', TRUE),
('Dr. Rahul Gupta', 'rahul@demo.com', '$2a$12$LcQKVR3QZRZ7PxL0m5R3/.rXz0GKJpwzp6vwB5B7BqCj9f3YLNO4q', '9000000003', 'DOCTOR', TRUE),
('Dr. Sneha Nair', 'sneha@demo.com', '$2a$12$LcQKVR3QZRZ7PxL0m5R3/.rXz0GKJpwzp6vwB5B7BqCj9f3YLNO4q', '9000000004', 'DOCTOR', TRUE),
-- Patients
('Ravi Kumar', 'patient@demo.com', '$2a$12$LcQKVR3QZRZ7PxL0m5R3/.rXz0GKJpwzp6vwB5B7BqCj9f3YLNO4q', '9000000005', 'PATIENT', TRUE),
('Anita Reddy', 'anita@demo.com', '$2a$12$LcQKVR3QZRZ7PxL0m5R3/.rXz0GKJpwzp6vwB5B7BqCj9f3YLNO4q', '9000000006', 'PATIENT', TRUE);

-- Doctor profiles
INSERT INTO doctors (user_id, specialization, experience, consultation_fee, bio, qualification, hospital, slot_duration, rating, total_ratings, is_available) VALUES
(2, 'Cardiology', 15, 800, 'Senior cardiologist with expertise in interventional cardiology and heart failure management.', 'MBBS, MD (Cardiology), DM', 'Apollo Hospital', 30, 4.8, 42, TRUE),
(3, 'Dermatology', 10, 600, 'Specialist in skin disorders, cosmetic dermatology and hair treatments.', 'MBBS, MD (Dermatology)', 'Fortis Hospital', 30, 4.6, 28, TRUE),
(4, 'Orthopedics', 12, 700, 'Expert in joint replacement, sports injuries and spine surgery.', 'MBBS, MS (Orthopedics)', 'AIIMS Delhi', 30, 4.7, 35, TRUE),
(5, 'Neurology', 8, 900, 'Neurologist specializing in stroke, epilepsy and movement disorders.', 'MBBS, MD, DM (Neurology)', 'Max Hospital', 30, 4.5, 19, TRUE);

-- Patient profiles
INSERT INTO patients (user_id, date_of_birth, blood_group, gender, address, emergency_contact, emergency_contact_name) VALUES
(6, '1990-05-15', 'B+', 'MALE', '123 MG Road, Bangalore, Karnataka', '9111111111', 'Meena Kumar'),
(7, '1985-11-20', 'O+', 'FEMALE', '456 Anna Nagar, Chennai, Tamil Nadu', '9222222222', 'Suresh Reddy');

-- Doctor availability (Mon-Fri, 9AM-5PM, lunch break 1-2PM)
INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time, is_available, break_start, break_end) VALUES
(1,'MONDAY','09:00:00','17:00:00',TRUE,'13:00:00','14:00:00'),
(1,'TUESDAY','09:00:00','17:00:00',TRUE,'13:00:00','14:00:00'),
(1,'WEDNESDAY','09:00:00','17:00:00',TRUE,'13:00:00','14:00:00'),
(1,'THURSDAY','09:00:00','17:00:00',TRUE,'13:00:00','14:00:00'),
(1,'FRIDAY','09:00:00','15:00:00',TRUE,'13:00:00','14:00:00'),
(2,'MONDAY','10:00:00','18:00:00',TRUE,'13:00:00','14:00:00'),
(2,'TUESDAY','10:00:00','18:00:00',TRUE,'13:00:00','14:00:00'),
(2,'WEDNESDAY','10:00:00','18:00:00',TRUE,'13:00:00','14:00:00'),
(2,'THURSDAY','10:00:00','18:00:00',TRUE,'13:00:00','14:00:00'),
(2,'SATURDAY','10:00:00','14:00:00',TRUE,NULL,NULL),
(3,'MONDAY','09:00:00','17:00:00',TRUE,'13:00:00','14:00:00'),
(3,'WEDNESDAY','09:00:00','17:00:00',TRUE,'13:00:00','14:00:00'),
(3,'FRIDAY','09:00:00','17:00:00',TRUE,'13:00:00','14:00:00'),
(4,'TUESDAY','11:00:00','19:00:00',TRUE,'14:00:00','15:00:00'),
(4,'THURSDAY','11:00:00','19:00:00',TRUE,'14:00:00','15:00:00'),
(4,'SATURDAY','09:00:00','13:00:00',TRUE,NULL,NULL);
