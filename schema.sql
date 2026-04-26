-- ============================================================
--  Smart Healthcare Management System — MySQL Schema
--  Run this BEFORE starting the Spring Boot application
--  OR let Spring Boot auto-create via ddl-auto=update
-- ============================================================

CREATE DATABASE IF NOT EXISTS healthcare_db
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE healthcare_db;

-- ─── Users ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id           BIGINT AUTO_INCREMENT PRIMARY KEY,
  name         VARCHAR(100)  NOT NULL,
  email        VARCHAR(100)  NOT NULL UNIQUE,
  password     VARCHAR(255)  NOT NULL,
  phone        VARCHAR(15),
  role         ENUM('PATIENT','DOCTOR','ADMIN') NOT NULL,
  profile_image VARCHAR(255),
  is_active    BOOLEAN DEFAULT TRUE,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_email (email),
  INDEX idx_user_role  (role)
) ENGINE=InnoDB;

-- ─── Patients ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS patients (
  id                    BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id               BIGINT NOT NULL UNIQUE,
  date_of_birth         DATE,
  blood_group           VARCHAR(5),
  address               TEXT,
  emergency_contact     VARCHAR(15),
  emergency_contact_name VARCHAR(100),
  allergies             TEXT,
  medical_history       TEXT,
  gender                VARCHAR(10),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ─── Doctors ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS doctors (
  id               BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id          BIGINT NOT NULL UNIQUE,
  specialization   VARCHAR(100) NOT NULL,
  experience       INT NOT NULL,
  consultation_fee DOUBLE NOT NULL,
  bio              TEXT,
  qualification    VARCHAR(200),
  hospital         VARCHAR(200),
  slot_duration    INT DEFAULT 30,
  rating           DECIMAL(3,2) DEFAULT 0.00,
  total_ratings    INT DEFAULT 0,
  is_available     BOOLEAN DEFAULT TRUE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ─── Doctor Availability ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS doctor_availability (
  id           BIGINT AUTO_INCREMENT PRIMARY KEY,
  doctor_id    BIGINT NOT NULL,
  day_of_week  ENUM('MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY') NOT NULL,
  start_time   TIME NOT NULL,
  end_time     TIME NOT NULL,
  is_available BOOLEAN DEFAULT TRUE,
  break_start  TIME,
  break_end    TIME,
  UNIQUE KEY uq_doctor_day (doctor_id, day_of_week),
  FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ─── Appointments ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS appointments (
  id               BIGINT AUTO_INCREMENT PRIMARY KEY,
  patient_id       BIGINT NOT NULL,
  doctor_id        BIGINT NOT NULL,
  appointment_date DATE NOT NULL,
  start_time       TIME NOT NULL,
  end_time         TIME NOT NULL,
  status           ENUM('SCHEDULED','COMPLETED','CANCELLED','NO_SHOW','RESCHEDULED') DEFAULT 'SCHEDULED',
  reason           TEXT,
  notes            TEXT,
  doctor_notes     TEXT,
  payment_status   ENUM('PENDING','PAID','FAILED','REFUNDED') DEFAULT 'PENDING',
  is_first_visit   BOOLEAN DEFAULT TRUE,
  reminder_sent    BOOLEAN DEFAULT FALSE,
  created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_appt_patient (patient_id),
  INDEX idx_appt_doctor  (doctor_id),
  INDEX idx_appt_date    (appointment_date),
  INDEX idx_appt_status  (status),
  FOREIGN KEY (patient_id) REFERENCES patients(id),
  FOREIGN KEY (doctor_id)  REFERENCES doctors(id)
) ENGINE=InnoDB;

-- ─── Prescriptions ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS prescriptions (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  appointment_id  BIGINT NOT NULL UNIQUE,
  doctor_id       BIGINT NOT NULL,
  patient_id      BIGINT NOT NULL,
  diagnosis       VARCHAR(500) NOT NULL,
  additional_notes TEXT,
  follow_up_date  DATE,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (appointment_id) REFERENCES appointments(id),
  FOREIGN KEY (doctor_id)      REFERENCES doctors(id),
  FOREIGN KEY (patient_id)     REFERENCES patients(id)
) ENGINE=InnoDB;

-- ─── Prescription Medicines ───────────────────────────────────
CREATE TABLE IF NOT EXISTS prescription_medicines (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  prescription_id BIGINT NOT NULL,
  medicine_name   VARCHAR(100) NOT NULL,
  dosage          VARCHAR(50),
  frequency       VARCHAR(100),
  duration        VARCHAR(50),
  instructions    TEXT,
  type            VARCHAR(50),
  FOREIGN KEY (prescription_id) REFERENCES prescriptions(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ─── Medication Dose Logs ───────────────────────────────────
CREATE TABLE IF NOT EXISTS medication_dose_logs (
  id                       BIGINT AUTO_INCREMENT PRIMARY KEY,
  patient_id               BIGINT NOT NULL,
  prescription_medicine_id BIGINT NOT NULL,
  dose_date                DATE NOT NULL,
  slot_index               INT NOT NULL,
  taken                    BOOLEAN DEFAULT TRUE,
  taken_at                 DATETIME,
  created_at               DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at               DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_dose_log_patient_medicine_date_slot (patient_id, prescription_medicine_id, dose_date, slot_index),
  INDEX idx_dose_log_patient_date (patient_id, dose_date),
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  FOREIGN KEY (prescription_medicine_id) REFERENCES prescription_medicines(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ─── Payments ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
  appointment_id      BIGINT NOT NULL UNIQUE,
  amount              DOUBLE NOT NULL,
  razorpay_order_id   VARCHAR(100) UNIQUE,
  razorpay_payment_id VARCHAR(100),
  razorpay_signature  VARCHAR(500),
  status              ENUM('PENDING','PAID','FAILED','REFUNDED') DEFAULT 'PENDING',
  currency            VARCHAR(10) DEFAULT 'INR',
  created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (appointment_id) REFERENCES appointments(id)
) ENGINE=InnoDB;

-- ─── Notifications ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id           BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id      BIGINT NOT NULL,
  title        VARCHAR(200) NOT NULL,
  message      TEXT NOT NULL,
  type         ENUM('APPOINTMENT_BOOKED','APPOINTMENT_CANCELLED','APPOINTMENT_REMINDER',
                    'APPOINTMENT_COMPLETED','PRESCRIPTION_ADDED','PAYMENT_SUCCESS','GENERAL') NOT NULL,
  is_read      BOOLEAN DEFAULT FALSE,
  reference_id BIGINT,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_notif_user (user_id),
  INDEX idx_notif_read (is_read),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ─── Ratings ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ratings (
  id             BIGINT AUTO_INCREMENT PRIMARY KEY,
  appointment_id BIGINT NOT NULL UNIQUE,
  patient_id     BIGINT NOT NULL,
  doctor_id      BIGINT NOT NULL,
  rating         INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review         TEXT,
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (appointment_id) REFERENCES appointments(id),
  FOREIGN KEY (patient_id)     REFERENCES patients(id),
  FOREIGN KEY (doctor_id)      REFERENCES doctors(id)
) ENGINE=InnoDB;

-- ─── Audit Logs ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id     BIGINT,
  action      VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id   BIGINT,
  details     TEXT,
  ip_address  VARCHAR(50),
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_user   (user_id),
  INDEX idx_audit_entity (entity_type, entity_id)
) ENGINE=InnoDB;

-- ─── Refresh Tokens ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id     BIGINT NOT NULL UNIQUE,
  token       VARCHAR(500) NOT NULL UNIQUE,
  expiry_date DATETIME NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
--  SEED DATA
--  Passwords are BCrypt of "password123" (cost 12)
-- ============================================================

INSERT IGNORE INTO users (name, email, password, phone, role, is_active) VALUES
-- Admin
('System Admin',     'admin@healthcare.com',   '$2a$12$LKBnfGliH/GjRMiAeHqFZeWMFnSwOA7lUOPyD5L2EBGhcXiANwTqC', '9000000001', 'ADMIN',   TRUE),
-- Doctors
('Dr. Arjun Mehta',  'arjun@healthcare.com',   '$2a$12$LKBnfGliH/GjRMiAeHqFZeWMFnSwOA7lUOPyD5L2EBGhcXiANwTqC', '9000000002', 'DOCTOR',  TRUE),
('Dr. Priya Sharma', 'priya@healthcare.com',   '$2a$12$LKBnfGliH/GjRMiAeHqFZeWMFnSwOA7lUOPyD5L2EBGhcXiANwTqC', '9000000003', 'DOCTOR',  TRUE),
('Dr. Rahul Nair',   'rahul@healthcare.com',   '$2a$12$LKBnfGliH/GjRMiAeHqFZeWMFnSwOA7lUOPyD5L2EBGhcXiANwTqC', '9000000004', 'DOCTOR',  TRUE),
('Dr. Sunita Patel', 'sunita@healthcare.com',  '$2a$12$LKBnfGliH/GjRMiAeHqFZeWMFnSwOA7lUOPyD5L2EBGhcXiANwTqC', '9000000005', 'DOCTOR',  TRUE),
-- Patients
('Rohan Verma',      'rohan@patient.com',      '$2a$12$LKBnfGliH/GjRMiAeHqFZeWMFnSwOA7lUOPyD5L2EBGhcXiANwTqC', '9111111111', 'PATIENT', TRUE),
('Ananya Singh',     'ananya@patient.com',     '$2a$12$LKBnfGliH/GjRMiAeHqFZeWMFnSwOA7lUOPyD5L2EBGhcXiANwTqC', '9222222222', 'PATIENT', TRUE);

-- Doctor Profiles
INSERT IGNORE INTO doctors (user_id, specialization, experience, consultation_fee, bio, qualification, hospital, slot_duration, rating, total_ratings, is_available)
SELECT id, 'Cardiology', 12, 800, 'Expert cardiologist with 12+ years of experience in interventional cardiology.', 'MBBS, MD (Cardiology), DM', 'Apollo Hospitals', 30, 4.8, 45, TRUE FROM users WHERE email='arjun@healthcare.com';

INSERT IGNORE INTO doctors (user_id, specialization, experience, consultation_fee, bio, qualification, hospital, slot_duration, rating, total_ratings, is_available)
SELECT id, 'Dermatology', 8, 600, 'Specialist in skin disorders, cosmetic dermatology and hair treatments.', 'MBBS, MD (Dermatology)', 'Fortis Healthcare', 30, 4.6, 32, TRUE FROM users WHERE email='priya@healthcare.com';

INSERT IGNORE INTO doctors (user_id, specialization, experience, consultation_fee, bio, qualification, hospital, slot_duration, rating, total_ratings, is_available)
SELECT id, 'Orthopedics', 15, 700, 'Senior orthopaedic surgeon specialising in joint replacement and sports injuries.', 'MBBS, MS (Orthopaedics)', 'Max Hospital', 30, 4.9, 67, TRUE FROM users WHERE email='rahul@healthcare.com';

INSERT IGNORE INTO doctors (user_id, specialization, experience, consultation_fee, bio, qualification, hospital, slot_duration, rating, total_ratings, is_available)
SELECT id, 'General Medicine', 5, 400, 'General physician providing comprehensive primary care.', 'MBBS, MD (General Medicine)', 'City Medical Centre', 30, 4.3, 18, TRUE FROM users WHERE email='sunita@healthcare.com';

-- Doctor Availability (Mon–Sat, 9 AM – 5 PM, 1–2 PM break)
INSERT IGNORE INTO doctor_availability (doctor_id, day_of_week, start_time, end_time, is_available, break_start, break_end)
SELECT d.id, day, '09:00:00', '17:00:00', TRUE, '13:00:00', '14:00:00'
FROM doctors d
JOIN users u ON d.user_id = u.id
CROSS JOIN (
  SELECT 'MONDAY'    day UNION SELECT 'TUESDAY' UNION SELECT 'WEDNESDAY'
  UNION SELECT 'THURSDAY' UNION SELECT 'FRIDAY' UNION SELECT 'SATURDAY'
) days
WHERE u.email IN ('arjun@healthcare.com','priya@healthcare.com','rahul@healthcare.com','sunita@healthcare.com');

-- Patient Profiles
INSERT IGNORE INTO patients (user_id, date_of_birth, blood_group, address, gender)
SELECT id, '1995-06-15', 'B+', '12 MG Road, Bengaluru, Karnataka', 'Male' FROM users WHERE email='rohan@patient.com';

INSERT IGNORE INTO patients (user_id, date_of_birth, blood_group, address, gender)
SELECT id, '1998-11-22', 'O+', '45 Park Street, Kolkata, West Bengal', 'Female' FROM users WHERE email='ananya@patient.com';

SELECT '✅ Schema and seed data created successfully!' AS Status;
SELECT CONCAT('👤 Users: ', COUNT(*)) AS Info FROM users UNION ALL
SELECT CONCAT('🩺 Doctors: ', COUNT(*)) FROM doctors UNION ALL
SELECT CONCAT('🏥 Patients: ', COUNT(*)) FROM patients UNION ALL
SELECT CONCAT('📅 Availability slots: ', COUNT(*)) FROM doctor_availability;
