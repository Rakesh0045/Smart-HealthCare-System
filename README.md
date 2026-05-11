# 🏥 Smart Healthcare Management System

A full-stack healthcare platform built with **Spring Boot 3**, **React 18**, and **MySQL**.

---

## 🗂️ Project Structure

```
healthcare-system/
├── backend/          ← Spring Boot 3 (Port 8081)
├── frontend/         ← React + Vite + Tailwind (Port 5173)
└── schema.sql        ← MySQL database setup
```

---

## ⚙️ Prerequisites

| Tool | Version |
|------|---------|
| Java | 17+ |
| Maven | 3.8+ |
| Node.js | 18+ |
| MySQL | 8.0+ |

---

## 🚀 Setup & Run

### Step 1 — MySQL Database

```bash
mysql -u root -p < schema.sql
```

Or manually run schema.sql in MySQL Workbench / DBeaver.

---

### Step 2 — Backend (Spring Boot)

**Option A: Using the backend `.env` file (recommended)**
```bash
cd backend

copy .env.example .env

# fill in .env with your real local values

mvn spring-boot:run
```

The backend loads `backend/.env` automatically through `application.yml`.

Backend runs on: **http://localhost:8081**
Swagger UI: **http://localhost:8081/swagger-ui.html**

---

### Step 3 — Frontend (React)

```bash
cd frontend

copy .env.example .env

npm install
npm run dev
```

Frontend runs on: **http://localhost:5173**

---

## 🔑 Default Login Credentials

> Password for all demo accounts: **password123**

| Role | Email |
|------|-------|
| Admin | admin@healthcare.com |
| Doctor (Cardiologist) | arjun@healthcare.com |
| Doctor (Dermatologist) | priya@healthcare.com |
| Doctor (Orthopaedics) | rahul@healthcare.com |
| Doctor (General Medicine) | sunita@healthcare.com |
| Patient | rohan@patient.com |
| Patient | ananya@patient.com |

---

## 🔧 Key Configuration

### `backend/src/main/resources/application.yml`

```yaml
app:
  notification:
    mode: dev        # dev = console logs | prod = real email + SMS
  gemini:
    api-key: YOUR_GEMINI_API_KEY
  razorpay:
    key-id: rzp_test_XXXX
    key-secret: YOUR_SECRET
  twilio:
    account-sid: YOUR_SID
    auth-token: YOUR_TOKEN
    from-number: +1234567890
```

### Getting Gemini API Key (Free)

1. Go to https://aistudio.google.com/app/apikey
2. Click "Create API Key"
3. Copy and set as `GEMINI_API_KEY`

### Getting Razorpay Test Keys

1. Sign up at https://razorpay.com
2. Go to Settings → API Keys → Generate Test Key
3. Set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`

### Dev Mode Notifications

In `dev` mode, all emails and SMS are **printed to the Spring Boot console** — no real credentials needed:

```
╔══════ [EMAIL MOCK - DEV MODE] ══════╗
║ TO      : patient@example.com
║ SUBJECT : ✅ Appointment Confirmed
╚═════════════════════════════════════╝
```

---

## 📡 API Endpoints Reference

### Authentication
```
POST /api/auth/register     Register new user
POST /api/auth/login        Login
POST /api/auth/refresh      Refresh token
POST /api/auth/logout       Logout
```

### Doctors (Public)
```
GET  /api/doctors                     All doctors
GET  /api/doctors/search?specialization=&maxFee=&name=
GET  /api/doctors/specializations     All specializations
GET  /api/doctors/{id}                Doctor by ID
GET  /api/doctors/{id}/slots?date=    Available time slots
```

### Doctor (Authenticated)
```
GET  /api/doctor/profile              My profile
POST /api/doctor/profile              Create/update profile
POST /api/doctor/availability         Set weekly schedule
PATCH /api/doctor/toggle-availability Toggle on/off
```

### Appointments
```
POST   /api/appointments              Book appointment (Patient)
GET    /api/appointments/my           My appointments
GET    /api/appointments/{id}         Single appointment
DELETE /api/appointments/{id}/cancel  Cancel
PUT    /api/appointments/{id}/reschedule
PATCH  /api/appointments/{id}/complete (Doctor)
GET    /api/appointments/doctor/today?date=
```

### Prescriptions
```
POST /api/prescriptions               Add prescription (Doctor)
GET  /api/prescriptions/my            My prescriptions
GET  /api/prescriptions/{id}          By ID
GET  /api/prescriptions/appointment/{id}
GET  /api/prescriptions/{id}/download  PDF download
```

### Payments
```
POST /api/payments/create-order/{appointmentId}
POST /api/payments/verify
```

### Notifications
```
GET   /api/notifications              All notifications
GET   /api/notifications/unread-count
PATCH /api/notifications/mark-all-read
PATCH /api/notifications/{id}/read
```

### Symptom Checker
```
POST /api/symptoms/suggest    Body: { "symptoms": "chest pain and breathlessness" }
```

### Admin
```
GET    /api/admin/dashboard    Full stats + analytics
GET    /api/admin/doctors
GET    /api/admin/patients
GET    /api/admin/users
DELETE /api/admin/users/{id}   Deactivate user
PATCH  /api/admin/users/{id}/activate
GET    /api/admin/audit-logs?page=0&size=20
```

---

## 🧩 Features

| Feature | Status |
|---------|--------|
| JWT Auth + Refresh Tokens | ✅ |
| Role-based Access (Patient / Doctor / Admin) | ✅ |
| Smart Slot Generation (30 min, no overlaps) | ✅ |
| Double-Booking Prevention | ✅ |
| Appointment Booking / Cancel / Reschedule | ✅ |
| Doctor Availability (weekly schedule + breaks) | ✅ |
| Prescription Management | ✅ |
| PDF Prescription Download (iText7) | ✅ |
| Symptom Checker (Gemini AI + keyword fallback) | ✅ |
| Razorpay Payment Integration | ✅ |
| In-App Notifications | ✅ |
| Email (dev mock / prod real) | ✅ |
| SMS via Twilio (dev mock / prod real) | ✅ |
| Doctor Rating & Review System | ✅ |
| Admin Dashboard with Recharts Analytics | ✅ |
| Audit Log System | ✅ |
| Daily Appointment Reminders (Scheduler) | ✅ |
| Doctor Search & Filter | ✅ |
| Auto No-Show Detection | ✅ |

---

## 🏗️ Architecture

```
React (Vite) ──HTTP──▶ Spring Boot (Port 8081)
                              │
                    ┌─────────┼──────────┐
                    │         │          │
                  MySQL   Gemini AI   Razorpay
               (JPA/Hibernate)  (REST)    (SDK)
```

---

## 🛠️ Tech Stack

**Backend**
- Spring Boot 3.2 (Web, Security, Data JPA, Mail, Actuator)
- JWT (jjwt 0.12)
- MySQL 8 + Hibernate
- iText7 (PDF)
- Razorpay Java SDK
- Twilio SDK
- Lombok, Swagger/OpenAPI

**Frontend**
- React 18 + TypeScript
- Vite 5
- Tailwind CSS 3
- Zustand (state management)
- Axios (API client)
- Recharts (analytics charts)
- Lucide React (icons)
- react-hot-toast (notifications)
