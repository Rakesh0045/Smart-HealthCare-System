<div align="center">

<br/>

<img src="screenshots/landing-page-gif.gif" alt="MediCare Landing Page" width="100%" style="border-radius: 16px; box-shadow: 0 8px 32px rgba(0,0,0,0.15);" />

<br/><br/>

<h1> 🏥 MediCare: Smart Healthcare Management System</h1>

<p>
  <strong>🩺 A full-stack digital health platform connecting Patients, Doctors & Administrators</strong><br/>
  🤖 AI-powered assistance · 📅 Seamless scheduling · 💊 Smart reminders · 📊 Real-time analytics
</p>

<p>
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white&style=for-the-badge" />
  <img src="https://img.shields.io/badge/Spring%20Boot-3.2-6DB33F?logo=spring&logoColor=white&style=for-the-badge" />
  <img src="https://img.shields.io/badge/MySQL-8.0-4479A1?logo=mysql&logoColor=white&style=for-the-badge" />
  <img src="https://img.shields.io/badge/Tailwind%20CSS-3.4-06B6D4?logo=tailwindcss&logoColor=white&style=for-the-badge" />
  <img src="https://img.shields.io/badge/Gemini%20AI-Integrated-4285F4?logo=google&logoColor=white&style=for-the-badge" />
  <img src="https://img.shields.io/badge/JWT-Secure-000000?logo=jsonwebtokens&logoColor=white&style=for-the-badge" />
</p>

<br/>

</div>

---

## 📑 Table of Contents

- [✨ Overview](#-overview)
- [🚀 Key Features](#-key-features)
  - [👤 For Patients](#-for-patients)
  - [👨‍⚕️ For Doctors](#-for-doctors)
  - [🛡️ For Administrators](#️-for-administrators)
- [🌟 Special Features Deep Dive](#-special-features-deep-dive)
- [📸 Full Screenshots Gallery](#-full-screenshots-gallery)
- [🏗️ System Architecture](#️-system-architecture)
- [⚙️ Technical Implementation](#️-technical-implementation)
  - [🏛️ Architecture Overview](#️-architecture-overview)
  - [🔐 Authentication Flow](#-authentication-flow)
  - [📅 Appointment Booking Workflow](#-appointment-booking-workflow)
  - [🤖 AI Chatbot Workflow](#-ai-chatbot-workflow)
  - [💳 Payment Flow](#-payment-flow)
  - [🛠️ Tech Stack](#️-tech-stack)
  - [🗄️ Database Design](#️-database-design)
- [🚀 Getting Started](#-getting-started)
  - [📋 Prerequisites](#-prerequisites)
  - [⚡ Quick Start](#-quick-start)
  - [🔧 Manual Setup](#-manual-setup)
- [📁 Project Structure](#-project-structure)
- [🔑 Environment Variables](#-environment-variables)
- [🎯 Demo Accounts](#-demo-accounts)
- [📖 API Documentation](#-api-documentation)

---

## ✨ Overview

MediCare is a modern, role-based healthcare management platform designed to streamline the **entire patient journey**, from symptom checking and appointment booking to treatment tracking, AI-assisted consultations, and automated medicine reminders. 🏥

Built with enterprise-grade security 🔐, real-time notifications 📧, and intelligent AI integration 🤖, it serves three distinct user personas:

| 👤 **Patients** | 👨‍⚕️ **Doctors** | 🛡️ **Administrators** |
|:---|:---|:---|
| Book appointments, track health, get AI insights & reminders | Manage patients, write prescriptions, schedule slots, get AI clinical help | Monitor analytics, manage users, review audit logs & system health |

---

## 🚀 Key Features

### 👤 For Patients

| Feature | Description |
|---------|-------------|
| 🤖 **AI Symptom Checker** | Describe symptoms in natural language and get AI-powered preliminary insights & next steps. |
| 📅 **Smart Appointment Booking** | Browse doctors by specialty, view real-time availability, select slots, and book instantly. |
| 📂 **Treatment Episodes** | All follow-ups, prescriptions & notes for a condition grouped into an intelligent **Treatment Episode** folder. |
| 📋 **Medical Records** | Securely view complete history, prescriptions, diagnoses & lab records shared by doctors. |
| 💬 **AI Health Chatbot** | Conversational AI to answer health questions, explain prescriptions & provide wellness guidance. |
| 🥗 **AI Lifestyle Recommendations** | Personalized diet, exercise & lifestyle suggestions based on your health profile & history. |
| 💊 **Medicine Reminders** | Smart reminders tied to active prescriptions so you never miss a dose. |
| 💳 **Online Payments** | Secure Razorpay-integrated payments with instant digital receipts & PDF slips. |
| 📧 **Email Notifications** | Automated confirmations, reminders, rescheduling alerts & welcome emails. |

### 👨‍⚕️ For Doctors

| Feature | Description |
|---------|-------------|
| 📊 **Doctor Dashboard** | Centralized view of today's appointments, patient queue & quick statistics. |
| 👥 **Patient Management** | Access profiles, complete medical history & previous treatment episodes. |
| 📝 **Prescription & Records** | Create digital prescriptions & records instantly visible to the patient. |
| 🤖 **AI Assistant** | AI chatbot to draft notes, look up drug interactions & get second-opinion suggestions. |
| 📆 **Schedule Management** | Set availability, block days & manage appointment slots dynamically. |
| ✅ **Appointment Handling** | Confirm, cancel, or reschedule appointments with automated patient notifications. |

### 🛡️ For Administrators

| Feature | Description |
|---------|-------------|
| 📈 **Admin Dashboard** | High-level analytics on appointments, revenue, registrations & doctor activity. |
| 👤 **User Management** | Manage & monitor all registered doctors and patients from one interface. |
| 📜 **Audit Logs** | Complete audit trail of system activities, user actions & security events. |
| 📉 **Analytics & Reports** | Visual charts & data-driven insights for operational decision-making. |

---

## 🌟 Special Features Deep Dive

MediCare isn't just another appointment booking app. These are the **signature innovations** that set it apart from conventional healthcare platforms.

---

### 📂 1. Treatment Episode Folders: Contextual Care Continuity

<div align="center">

<table>
<tr>
<td align="center" width="50%">
  <img src="screenshots/patient-treatment-episode.png" width="100%" style="border-radius: 12px;" /><br/>
  <sub>📂 Patient View: Treatment Episode Folder</sub>
</td>
<td align="center" width="50%">
  <img src="screenshots/doctor-patient-medical-history.png" width="100%" style="border-radius: 12px;" /><br/>
  <sub>👨‍⚕️ Doctor View: Complete Patient Context</sub>
</td>
</tr>
</table>

</div>

> **The Problem:** In traditional systems, every follow-up visit creates a disconnected record. Doctors struggle to see the full picture, and patients lose track of their care journey.

> **The Solution:** MediCare's **Treatment Episode** system groups **all visits, prescriptions, medical records, and notes** for a single condition into one unified folder.

**How it works:**
- 🏷️ When a patient visits a doctor for a condition (e.g., "Diabetes Type 2"), a Treatment Episode is auto-created
- 📝 Every follow-up, prescription refill, lab result, and doctor's note gets appended to that episode
- 🔍 Both patient and doctor can open the episode and see the **complete chronological story** of that condition
- 📊 No more scrolling through scattered records; everything is contextual and grouped

**Benefits:**
- 👨‍⚕️ Doctors get **full clinical context** before every follow-up
- 👤 Patients understand their own care journey without confusion
- 🏥 Perfect for chronic disease management where continuity is critical

---

### 💊 2. Smart Medicine Reminders: Never Miss a Dose

<div align="center">

<table>
<tr>
<td align="center" width="50%">
  <img src="screenshots/patient-medicine-reminder.png" width="100%" style="border-radius: 12px;" /><br/>
  <sub>⏰ Smart Reminder Dashboard</sub>
</td>
<td align="center" width="50%">
  <img src="screenshots/patient-prescription.png" width="100%" style="border-radius: 12px;" /><br/>
  <sub>💊 Active Prescriptions Linked to Reminders</sub>
</td>
</tr>
</table>

</div>

> **The Problem:** Generic alarm apps don't understand *what* medicine you're taking, *why* you're taking it, or when your prescription runs out.

> **The Solution:** MediCare's reminders are **intelligently tied to active prescriptions** created by your doctor.

**How it works:**
- 📝 When a doctor writes a prescription, the system auto-generates a reminder schedule
- ⏰ Reminders are **dose-specific**, such as "Take 1 tablet of Amoxicillin 500mg after breakfast"
- 🔔 Notifications appear in-app and can be synced via email
- 📅 Smart tracking shows which doses were taken and which were missed
- 🏥 When a prescription expires or a treatment episode closes, reminders auto-stop

**Benefits:**
- 💯 **Context-aware:** reminders know the drug name, dosage, and reason
- 🔄 **Auto-managed:** no manual setup; reminders generate from prescriptions
- 📊 **Adherence tracking:** patients and doctors can see medication compliance over time

---

### 🤖 3. AI Symptom Checker: Your First Line of Insight

<div align="center">

<table>
<tr>
<td align="center" width="50%">
  <img src="screenshots/ai-symptom-checker.png" width="100%" style="border-radius: 12px;" /><br/>
  <sub>🤖 Symptom Checker Interface</sub>
</td>
<td align="center" width="50%">
  <img src="screenshots/ai-symptom-checker-1.png" width="100%" style="border-radius: 12px;" /><br/>
  <sub>📋 AI-Generated Insights & Recommendations</sub>
</td>
</tr>
</table>

</div>

> **The Problem:** Patients often Google symptoms and get anxiety-inducing, inaccurate results. There's no structured way to get preliminary health guidance before seeing a doctor.

> **The Solution:** MediCare's **AI Symptom Checker** powered by Google Gemini lets patients describe symptoms in **natural language** and receive structured, calm, and actionable insights.

**How it works:**
- 💬 Patients type symptoms freely: *"I've had a throbbing headache on the left side for 3 days with nausea"*
- 🤖 Gemini AI analyzes the input and returns a structured response with:
  - 🔍 **Possible causes** (with confidence levels)
  - ⚠️ **Red flags** that require immediate medical attention
  - 🏥 **Recommended next steps:** whether to book a specialist, rest, or visit ER
  - 💊 **General self-care advice** (non-prescriptive)
- 📋 The AI also suggests **which specialist** to book based on the symptoms

**Benefits:**
- 🧘 Reduces patient anxiety with structured, calm responses
- 🎯 **Directs patients to the right specialist** instead of random browsing
- ⚡ Saves time for both patients and doctors by surfacing relevant context before the appointment

---

### 💬 4. Dual AI Chatbots: One for Patients, One for Doctors

MediCare features **two distinct AI assistants**, each tailored to their user's needs and context.

#### 🧑‍⚕️ Patient AI Chatbot: Your Health Companion

<div align="center">

<table>
<tr>
<td align="center" width="50%">
  <img src="screenshots/ai-chatbot.png" width="100%" style="border-radius: 12px;" /><br/>
  <sub>💬 General Health Chatbot</sub>
</td>
<td align="center" width="50%">
  <img src="screenshots/patient-medical-history-chatbot.png" width="100%" style="border-radius: 12px;" /><br/>
  <sub>📜 Medical History-Aware Chatbot</sub>
</td>
</tr>
</table>

</div>

**What it does:**
- 💬 Answers general health questions in plain language
- 📜 **Reads your medical history:** when asked about your condition, it references your actual Treatment Episodes and prescriptions
- 💊 Explains what your prescriptions do, possible side effects, and interactions
- 🥗 Suggests lifestyle adjustments based on your diagnosed conditions
- 🩺 Prepares you for appointments by suggesting questions to ask your doctor

#### 👨‍⚕️ Doctor AI Chatbot: Clinical Decision Support

<div align="center">

<table>
<tr>
<td align="center" width="50%">
  <img src="screenshots/doctor-ai-chatbot.png" width="100%" style="border-radius: 12px;" /><br/>
  <sub>🤖 Doctor's Clinical AI Assistant</sub>
</td>
<td align="center" width="50%">
  <img src="screenshots/patient-medical-history-chatbot-1.png" width="100%" style="border-radius: 12px;" /><br/>
  <sub>📋 Contextual Patient History Analysis</sub>
</td>
</tr>
</table>

</div>

**What it does:**
- 📝 **Drafts medical notes** and prescription text based on patient history
- 💊 Checks for **drug-drug interactions** when prescribing multiple medications
- 🔍 Suggests **differential diagnoses** based on symptoms and patient history
- 📊 Provides **second-opinion insights** by analyzing similar cases in the system
- ⏱️ Saves doctors significant documentation time

**Key Difference:** The patient chatbot is **general wellness-focused**, while the doctor chatbot is **clinical-grade and integrated with patient records** for decision support.

---

### 🥗 5. AI Lifestyle Recommendations: Personalized Wellness

<div align="center">

<table>
<tr>
<td align="center" width="50%">
  <img src="screenshots/lifestyle-recommendation.png" width="100%" style="border-radius: 12px;" /><br/>
  <sub>🥗 AI-Generated Lifestyle Plan</sub>
</td>
<td align="center" width="50%">
  <img src="screenshots/patient-ai-lifestyle-recommendations.png" width="100%" style="border-radius: 12px;" /><br/>
  <sub>📋 Patient View: Diet & Exercise Suggestions</sub>
</td>
</tr>
</table>

</div>

> **The Problem:** Generic diet and exercise advice doesn't account for a person's actual health conditions, medications, and medical history.

> **The Solution:** MediCare's AI generates **truly personalized lifestyle recommendations** by analyzing the patient's full medical profile.

**How it works:**
- 🧬 The AI reads the patient's **Treatment Episodes**, **active prescriptions**, and **diagnosed conditions**
- 🥗 It generates personalized recommendations across:
  - **Diet:** foods to eat and foods to avoid based on conditions, such as low sodium for hypertension
  - **Exercise:** safe activity levels considering medications and cardiac history
  - **Sleep:** hygiene tips tailored to stress and medication profiles
  - **Mental Wellness:** stress management for chronic illness patients
- 📋 Recommendations are presented in a clean, actionable format with explanations
- 🔄 As the patient's treatment episodes evolve, recommendations auto-update

**Benefits:**
- 🎯 **Truly personalized:** not cookie-cutter advice; it is based on *your* records
- 🏥 **Medically informed:** considers drug interactions and condition contraindications
- 📊 **Trackable:** patients can follow recommendations and report adherence back to doctors

---

### 📋 6. Digital Medical Records: Secure, Shared & Structured

<div align="center">

<table>
<tr>
<td align="center" width="50%">
  <img src="screenshots/patient-medical-history.png" width="100%" style="border-radius: 12px;" /><br/>
  <sub>👤 Patient View: Complete Medical History</sub>
</td>
<td align="center" width="50%">
  <img src="screenshots/doctor-medical-records.png" width="100%" style="border-radius: 12px;" /><br/>
  <sub>👨‍⚕️ Doctor View: Structured Medical Records</sub>
</td>
</tr>
</table>

</div>

> **The Problem:** Patients carry paper files or disjointed reports. Doctors waste appointment time asking "What medications are you on?" and "When was your last blood test?"

> **The Solution:** MediCare maintains a **single source of truth** for every patient's medical journey.

**How it works:**
- 📝 Doctors create structured medical records during or after appointments
- 💊 Prescriptions are digitized with drug name, dosage, frequency, and duration
- 🔬 Lab results and diagnoses are linked to the relevant Treatment Episode
- 🔐 **Role-based access:** patients see their own records; doctors see records of their patients
- 📄 Everything is exportable as a **PDF medical report** for external use

**Benefits:**
- 📊 **No more "What was my diagnosis?":** patients have lifetime access to their records
- ⏱️ **Faster consultations:** doctors review history in seconds before the patient arrives
- 🏥 **Continuity across doctors:** a specialist can see the full picture from the primary care physician

---

### 📄 7. Dynamic PDF Generation: Instant Digital Documents

<div align="center">

<table>
<tr>
<td align="center" width="50%">
  <img src="screenshots/prescription-pdf.png" width="100%" style="border-radius: 12px;" /><br/>
  <sub>📄 Generated Prescription PDF</sub>
</td>
<td align="center" width="50%">
  <img src="screenshots/appointment-slip-pdf.jpeg" width="100%" style="border-radius: 12px;" /><br/>
  <sub>🎫 Generated Appointment Slip PDF</sub>
</td>
</tr>
</table>

</div>

> **The Problem:** Digital healthcare systems often lack proper document generation, forcing users to screenshot pages or manually create PDFs.

> **The Solution:** MediCare uses **iText7** to generate professional, printable PDFs instantly.

**Generated documents include:**
- 🎫 **Appointment Slips:** include QR code, doctor details, date/time, and clinic address
- 📄 **Prescriptions:** formatted like a real medical prescription with doctor's digital signature area
- 📋 **Medical Reports:** complete treatment summaries for insurance or referrals
- 💳 **Payment Receipts:** Razorpay-integrated with transaction ID and breakdown

**Benefits:**
- 🖨️ **Print-ready:** professional formatting suitable for physical filing
- 📧 **Email-attachable:** automatically sent to patients after generation
- 🔒 **Tamper-evident:** structured layout makes forgery obvious

---

## 📸 Full Screenshots Gallery

<div align="center">

### 🏠 Landing & Authentication

<table>
<tr>
<td align="center" width="25%">
  <img src="screenshots/landing-page-gif.gif" width="100%" style="border-radius: 12px;" /><br/>
  <sub>🎬 Landing Page</sub>
</td>
<td align="center" width="25%">
  <img src="screenshots/login-page.png" width="100%" style="border-radius: 12px;" /><br/>
  <sub>🔐 Login</sub>
</td>
<td align="center" width="25%">
  <img src="screenshots/register-page.png" width="100%" style="border-radius: 12px;" /><br/>
  <sub>📝 Register</sub>
</td>
<td align="center" width="25%">
  <img src="screenshots/email-verification.png" width="100%" style="border-radius: 12px;" /><br/>
  <sub>✉️ Email Verification</sub>
</td>
</tr>
</table>

---

### 👤 Patient Experience

<table>
<tr>
<td align="center" width="25%">
  <img src="screenshots/patient-dashboard.png" width="100%" style="border-radius: 12px;" /><br/>
  <sub>📊 Dashboard</sub>
</td>
<td align="center" width="25%">
  <img src="screenshots/patient-book-appointment-page.png" width="100%" style="border-radius: 12px;" /><br/>
  <sub>📅 Book Appointment</sub>
</td>
<td align="center" width="25%">
  <img src="screenshots/patient-book-slot.png" width="100%" style="border-radius: 12px;" /><br/>
  <sub>⏰ Select Slot</sub>
</td>
<td align="center" width="25%">
  <img src="screenshots/patient-medicine-reminder.png" width="100%" style="border-radius: 12px;" /><br/>
  <sub>💊 Medicine Reminder</sub>
</td>
</tr>
</table>

<table>
<tr>
<td align="center" width="25%">
  <img src="screenshots/patient-appointments.png" width="100%" style="border-radius: 12px;" /><br/>
  <sub>📋 My Appointments</sub>
</td>
<td align="center" width="25%">
  <img src="screenshots/patient-prescription.png" width="100%" style="border-radius: 12px;" /><br/>
  <sub>💊 Prescriptions</sub>
</td>
<td align="center" width="25%">
  <img src="screenshots/patient-prescription-details.png" width="100%" style="border-radius: 12px;" /><br/>
  <sub>📄 Prescription Detail</sub>
</td>
<td align="center" width="25%">
  <img src="screenshots/patient-treatment-episode.png" width="100%" style="border-radius: 12px;" /><br/>
  <sub>📂 Treatment Episode</sub>
</td>
</tr>
</table>

<table>
<tr>
<td align="center" width="25%">
  <img src="screenshots/patient-medical-history.png" width="100%" style="border-radius: 12px;" /><br/>
  <sub>📋 Medical History</sub>
</td>
<td align="center" width="25%">
  <img src="screenshots/patient-ai-lifestyle-recommendations.png" width="100%" style="border-radius: 12px;" /><br/>
  <sub>🥗 AI Lifestyle</sub>
</td>
<td align="center" width="25%">
  <img src="screenshots/ai-symptom-checker.png" width="100%" style="border-radius: 12px;" /><br/>
  <sub>🤖 Symptom Checker</sub>
</td>
<td align="center" width="25%">
  <img src="screenshots/patient-medical-history-chatbot.png" width="100%" style="border-radius: 12px;" /><br/>
  <sub>💬 AI Chatbot</sub>
</td>
</tr>
</table>

---

### 👨‍⚕️ Doctor Portal

<table>
<tr>
<td align="center" width="25%">
  <img src="screenshots/doctor-dashboard.png" width="100%" style="border-radius: 12px;" /><br/>
  <sub>📊 Dashboard</sub>
</td>
<td align="center" width="25%">
  <img src="screenshots/doctor-patients.png" width="100%" style="border-radius: 12px;" /><br/>
  <sub>👥 Patients</sub>
</td>
<td align="center" width="25%">
  <img src="screenshots/doctor-appointments.png" width="100%" style="border-radius: 12px;" /><br/>
  <sub>📅 Appointments</sub>
</td>
<td align="center" width="25%">
  <img src="screenshots/doctor-schedule.png" width="100%" style="border-radius: 12px;" /><br/>
  <sub>📆 Schedule</sub>
</td>
</tr>
</table>

<table>
<tr>
<td align="center" width="25%">
  <img src="screenshots/doctor-medical-records.png" width="100%" style="border-radius: 12px;" /><br/>
  <sub>📋 Medical Records</sub>
</td>
<td align="center" width="25%">
  <img src="screenshots/doctor-prescriptions.png" width="100%" style="border-radius: 12px;" /><br/>
  <sub>📝 Prescriptions</sub>
</td>
<td align="center" width="25%">
  <img src="screenshots/doctor-patient-medical-history.png" width="100%" style="border-radius: 12px;" /><br/>
  <sub>📜 Patient History</sub>
</td>
<td align="center" width="25%">
  <img src="screenshots/doctor-ai-chatbot.png" width="100%" style="border-radius: 12px;" /><br/>
  <sub>🤖 AI Assistant</sub>
</td>
</tr>
</table>

---

### 🛡️ Admin Panel

<table>
<tr>
<td align="center" width="20%">
  <img src="screenshots/admin-dashboard.png" width="100%" style="border-radius: 12px;" /><br/>
  <sub>📈 Dashboard</sub>
</td>
<td align="center" width="20%">
  <img src="screenshots/admin-manage-doctors.png" width="100%" style="border-radius: 12px;" /><br/>
  <sub>👨‍⚕️ Manage Doctors</sub>
</td>
<td align="center" width="20%">
  <img src="screenshots/admin-manage-patient.png" width="100%" style="border-radius: 12px;" /><br/>
  <sub>👤 Manage Patients</sub>
</td>
<td align="center" width="20%">
  <img src="screenshots/admin-analytics.png" width="100%" style="border-radius: 12px;" /><br/>
  <sub>📊 Analytics</sub>
</td>
<td align="center" width="20%">
  <img src="screenshots/admin-audit-logs.png" width="100%" style="border-radius: 12px;" /><br/>
  <sub>📜 Audit Logs</sub>
</td>
</tr>
</table>

---

### 📧 Notifications & Documents

<table>
<tr>
<td align="center" width="16%">
  <img src="screenshots/verify-mail.jpeg" width="100%" style="border-radius: 12px;" /><br/>
  <sub>✅ Booking Mail</sub>
</td>
<td align="center" width="16%">
  <img src="screenshots/confirmation-mail.jpeg" width="100%" style="border-radius: 12px;" /><br/>
  <sub>📨 Confirmation</sub>
</td>
<td align="center" width="16%">
  <img src="screenshots/reschedule-mail.jpeg" width="100%" style="border-radius: 12px;" /><br/>
  <sub>🔄 Reschedule</sub>
</td>
<td align="center" width="16%">
  <img src="screenshots/welcome-mail.jpeg" width="100%" style="border-radius: 12px;" /><br/>
  <sub>👋 Welcome Mail</sub>
</td>
<td align="center" width="16%">
  <img src="screenshots/appointment-slip-pdf.jpeg" width="100%" style="border-radius: 12px;" /><br/>
  <sub>🎫 Appointment Slip</sub>
</td>
<td align="center" width="16%">
  <img src="screenshots/prescription-pdf.png" width="100%" style="border-radius: 12px;" /><br/>
  <sub>📄 Prescription PDF</sub>
</td>
</tr>
</table>

</div>

---

## 🏗️ System Architecture

MediCare follows a **modern three-tier architecture** with clean separation of concerns, stateless JWT authentication, and modular services that are easy to extend.

```mermaid
flowchart TB
    subgraph Presentation["Presentation Layer: React 18 + Vite + Tailwind"]
        Landing["Landing Page"]
        PatientPortal["Patient Portal"]
        DoctorPortal["Doctor Portal"]
        AdminPanel["Admin Panel"]
    end

    subgraph Application["Application Layer: Spring Boot 3.2 + Spring Security"]
        Auth["Auth Service<br/>JWT + RBAC"]
        Booking["Booking Service<br/>Slots + Appointments"]
        AI["AI Service<br/>Gemini Integration"]
        Records["Records Service<br/>Medical Records + Prescriptions"]
        Payments["Payment Service<br/>Razorpay"]
        Notify["Notification Service<br/>SMTP + Twilio"]
    end

    subgraph Data["Data and External Services"]
        MySQL["MySQL Database"]
        PDF["iText7 PDF Generator"]
        Razorpay["Razorpay Gateway"]
        Gemini["Gemini AI API"]
    end

    Presentation -->|"HTTPS / REST"| Application
    Application --> MySQL
    Application --> PDF
    Payments --> Razorpay
    AI --> Gemini
```

---

## ⚙️ Technical Implementation

### 🏛️ Architecture Overview

```mermaid
flowchart LR
    Browser["Browser"]
    React["React UI<br/>Vite + TypeScript"]
    API["Spring Boot REST API<br/>Port 8081"]
    DB["MySQL Database<br/>Port 3306"]
    Gemini["Gemini AI<br/>Symptoms + Lifestyle"]
    Razorpay["Razorpay<br/>Payments"]
    SMTP["SMTP Server<br/>Emails"]

    Browser --> React
    React <-->|"JWT + REST"| API
    API <-->|"JPA"| DB
    API --> Gemini
    API --> Razorpay
    API --> SMTP
```

### 🔐 Authentication Flow

```mermaid
sequenceDiagram
    actor User
    participant Browser
    participant Auth as Backend Auth Filter
    participant DB as MySQL Database
    participant API as Protected Controller

    User->>Browser: Enter credentials
    Browser->>Auth: Login request
    Auth->>DB: Validate user
    DB-->>Auth: User data and roles
    Auth-->>Browser: JWT token
    Browser->>API: Request with Bearer token
    API->>Auth: Validate token and role
    Auth-->>API: Allow or deny
    API-->>Browser: Protected response
```

### 📅 Appointment Booking Workflow

```mermaid
sequenceDiagram
    actor Patient
    participant Frontend
    participant Backend
    participant Doctor
    participant Payment as Razorpay
    participant Email as Email Service

    Patient->>Frontend: Browse doctors
    Frontend->>Backend: Request doctors and slots
    Backend-->>Frontend: Doctor list with available slots
    Patient->>Frontend: Select slot and book
    Frontend->>Backend: Create appointment
    Backend->>Doctor: Lock selected slot
    Doctor-->>Backend: Slot confirmed
    Backend-->>Frontend: Booking confirmed
    Patient->>Payment: Pay via Razorpay checkout
    Payment-->>Backend: Payment verification data
    Backend-->>Frontend: Payment success with PDF slip
    Backend->>Email: Send confirmation email
```

### 🤖 AI Chatbot Workflow

```mermaid
sequenceDiagram
    actor User as Patient or Doctor
    participant UI as Chat Interface
    participant Backend as Backend AI Service
    participant Records as Medical Records
    participant Gemini as Gemini AI API

    User->>UI: Ask a health question
    UI->>Backend: Send chat query
    Backend->>Records: Add role-specific medical context
    Records-->>Backend: Relevant episodes, prescriptions, and notes
    Backend->>Gemini: Send engineered prompt
    Gemini-->>Backend: AI response
    Backend-->>UI: Safe, contextual reply
```

**Context-aware prompt examples:**
- **Patient:** "Based on your medical history, here are lifestyle tips for this treatment episode..."
- **Doctor:** "For this medication combination, watch for these interactions..."

### 💳 Payment Flow

```mermaid
sequenceDiagram
    actor Patient
    participant Frontend
    participant Backend
    participant Razorpay
    participant PDF as PDF Service
    participant Email as Email Service

    Patient->>Frontend: Click Pay
    Frontend->>Backend: Create Razorpay order
    Backend->>Razorpay: Generate order
    Razorpay-->>Backend: Order ID and key
    Backend-->>Frontend: Checkout config
    Frontend-->>Patient: Open Razorpay checkout
    Patient->>Razorpay: Complete payment
    Razorpay-->>Backend: Payment signature
    Backend->>Razorpay: Verify signature
    Backend->>PDF: Generate receipt
    Backend->>Email: Send receipt
    Backend-->>Frontend: Payment complete
```

### 🛠️ Tech Stack

#### 🎨 Frontend

| Technology | Purpose | Badge |
|:---|:---|:---|
| **React 18** + TypeScript | Component-based UI with type safety | ![React](https://img.shields.io/badge/-React-61DAFB?logo=react&logoColor=white) |
| **Vite** | Ultra-fast build tool & dev server | ![Vite](https://img.shields.io/badge/-Vite-646CFF?logo=vite&logoColor=white) |
| **Tailwind CSS** | Utility-first responsive styling | ![Tailwind](https://img.shields.io/badge/-Tailwind-06B6D4?logo=tailwindcss&logoColor=white) |
| **Radix UI** | Accessible primitives (dialogs, dropdowns, tabs) | ![Radix](https://img.shields.io/badge/-Radix-000000?logo=radixui&logoColor=white) |
| **Framer Motion** | Smooth animations & transitions | ![Framer](https://img.shields.io/badge/-Framer-0055FF?logo=framer&logoColor=white) |
| **Zustand** | Lightweight global state management | ![Zustand](https://img.shields.io/badge/-Zustand-000000?logo=react&logoColor=white) |
| **Recharts** | Interactive data visualization | ![Recharts](https://img.shields.io/badge/-Recharts-22B5BF?logo=chartdotjs&logoColor=white) |
| **React Router v6** | Client-side routing with role guards | ![Router](https://img.shields.io/badge/-Router-CA4245?logo=reactrouter&logoColor=white) |
| **Axios** | HTTP client with JWT interceptors | ![Axios](https://img.shields.io/badge/-Axios-5A29E4?logo=axios&logoColor=white) |
| **Lucide React** | Modern consistent icon system | ![Lucide](https://img.shields.io/badge/-Lucide-000000?logo=icons&logoColor=white) |

#### ⚙️ Backend

| Technology | Purpose | Badge |
|:---|:---|:---|
| **Spring Boot 3.2** | Production-grade REST API | ![Spring](https://img.shields.io/badge/-Spring-6DB33F?logo=spring&logoColor=white) |
| **Spring Security** + JWT | Stateless auth & RBAC | ![JWT](https://img.shields.io/badge/-JWT-000000?logo=jsonwebtokens&logoColor=white) |
| **Spring Data JPA** | ORM & database abstraction | ![JPA](https://img.shields.io/badge/-JPA-6DB33F?logo=hibernate&logoColor=white) |
| **MySQL 8.0** | Relational data storage | ![MySQL](https://img.shields.io/badge/-MySQL-4479A1?logo=mysql&logoColor=white) |
| **Spring Mail (SMTP)** | Transactional email delivery | ![Mail](https://img.shields.io/badge/-SMTP-EA4335?logo=gmail&logoColor=white) |
| **iText7** | Dynamic PDF generation | ![PDF](https://img.shields.io/badge/-iText7-F40F02?logo=adobeacrobatreader&logoColor=white) |
| **Razorpay SDK** | Secure payment gateway | ![Razorpay](https://img.shields.io/badge/-Razorpay-0C2451?logo=razorpay&logoColor=white) |
| **Twilio SDK** | SMS notifications | ![Twilio](https://img.shields.io/badge/-Twilio-F22F46?logo=twilio&logoColor=white) |
| **SpringDoc OpenAPI** | Auto-generated Swagger docs | ![Swagger](https://img.shields.io/badge/-Swagger-85EA2D?logo=swagger&logoColor=black) |
| **Lombok** | Boilerplate-free Java models | ![Lombok](https://img.shields.io/badge/-Lombok-BC2055?logo=java&logoColor=white) |

### 🗄️ Database Design

```mermaid
erDiagram
    USERS ||--o| PATIENTS : "has profile"
    USERS ||--o| DOCTORS : "has profile"
    PATIENTS ||--o{ APPOINTMENTS : "books"
    DOCTORS ||--o{ APPOINTMENTS : "handles"
    APPOINTMENTS ||--o| PAYMENTS : "generates"
    PATIENTS ||--o{ TREATMENT_EPISODES : "owns"
    TREATMENT_EPISODES ||--o{ MEDICAL_RECORDS : "contains"
    MEDICAL_RECORDS ||--o{ PRESCRIPTIONS : "creates"
    PRESCRIPTIONS ||--o{ MEDICINE_REMINDERS : "schedules"
    USERS ||--o{ AUDIT_LOGS : "produces"
```

The relational schema (`schema.sql`) includes:

- **👤 Users:** Core identity with role-based differentiation (`PATIENT`, `DOCTOR`, `ADMIN`)
- **👤 Patients & 👨‍⚕️ Doctors:** Extended profile entities with specialization, experience, and demographic data
- **📅 Appointments:** Full booking lifecycle with status tracking (`PENDING`, `CONFIRMED`, `COMPLETED`, `CANCELLED`)
- **📂 Treatment Episodes:** Logical grouping of all follow-up visits, records, and prescriptions for a single condition
- **📝 Medical Records:** Structured clinical notes linked to episodes
- **💊 Prescriptions:** Digitized medication orders with dosage, frequency & duration
- **⏰ Medicine Reminders:** Scheduled dosage notifications tied to active prescriptions
- **💳 Payments:** Transaction records synced with Razorpay order IDs
- **📜 Audit Logs:** Immutable activity tracking for compliance & security

---

## 🚀 Getting Started

### 📋 Prerequisites

Ensure you have the following installed:

| Tool | Version | Badge |
|:---|:---|:---|
| ☕ **Java** | 17+ | ![Java](https://img.shields.io/badge/-Java%2017-007396?logo=openjdk&logoColor=white) |
| 📦 **Maven** | 3.9+ | ![Maven](https://img.shields.io/badge/-Maven-C71A36?logo=apachemaven&logoColor=white) |
| 🟢 **Node.js** | 18+ | ![Node](https://img.shields.io/badge/-Node.js%2018-339933?logo=nodedotjs&logoColor=white) |
| 🐬 **MySQL** | 8.0+ | ![MySQL](https://img.shields.io/badge/-MySQL%208.0-4479A1?logo=mysql&logoColor=white) |

**Optional:**
- 🔑 **Gemini API key** for AI features
- 💳 **Razorpay credentials** for live payments
- 📧 **SMTP credentials** for transactional emails

### ⚡ Quick Start

Run the provided startup script for **one-command launch**: 🚀

```bash
chmod +x start-dev.sh
./start-dev.sh
```

The script will:
1. ✅ Verify all required tools
2. 🗄️ Create and seed the MySQL database
3. 🔑 Prompt for API keys (Gemini and Razorpay are optional)
4. 🚀 Start the Spring Boot backend on `http://localhost:8081`
5. 🎨 Install frontend dependencies & start React dev server on `http://localhost:5173`

### 🔧 Manual Setup

#### 1️⃣ Database Setup

```bash
mysql -u root -p < schema.sql
```

#### 2️⃣ Backend Setup

Create `backend/.env` or export variables:

```bash
export DB_USERNAME=root
export DB_PASSWORD=your_password
export JWT_SECRET=your_super_secret_jwt_key_at_least_256_bits
export GEMINI_API_KEY=your_gemini_api_key
export RAZORPAY_KEY_ID=your_razorpay_key
export RAZORPAY_KEY_SECRET=your_razorpay_secret
export NOTIFICATION_MODE=dev
```

Run the backend:

```bash
cd backend
mvn spring-boot:run
```

🌐 Backend runs at: `http://localhost:8081`

#### 3️⃣ Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

🎨 Frontend runs at: `http://localhost:5173`

---

## 📁 Project Structure

| Area | Path | What it contains |
|:---|:---|:---|
| ⚙️ Backend | `backend/` | Spring Boot API, security, controllers, services, entities, repositories, and Maven config |
| 🎨 Frontend | `frontend/` | React app with pages, reusable components, hooks, Zustand stores, API utilities, and TypeScript types |
| 🗄️ Database | `database/schema.sql` | Full MySQL schema used to initialize the application database |
| 📸 Screenshots | `screenshots/` | Product screenshots and GIFs used throughout this README |
| 🚀 Startup Script | `start-dev.sh` | One-command local development launcher |

**Backend package map**

| Package | Purpose |
|:---|:---|
| `config/` | Security, CORS, and web configuration |
| `controller/` | REST API endpoints |
| `dto/` | Request and response payloads |
| `entity/` | JPA database models |
| `exception/` | Global exception handling |
| `repository/` | Spring Data JPA repositories |
| `security/` | JWT filters and authentication logic |
| `service/` | Core business logic |

---

## 🔑 Environment Variables

| Variable | Required | Description | Example |
|----------|:--------:|-------------|---------|
| `DB_USERNAME` | ✅ Yes | MySQL database username | `root` |
| `DB_PASSWORD` | ✅ Yes | MySQL database password | `password123` |
| `JWT_SECRET` | ✅ Yes | 256-bit secret for JWT signing | `SuperSecretKey256BitsLong!` |
| `NOTIFICATION_MODE` | ✅ Yes | `dev` for console, `prod` for SMTP | `dev` |
| `GEMINI_API_KEY` | ❌ No | Google Gemini API key for AI | `AIza...` |
| `RAZORPAY_KEY_ID` | ❌ No | Razorpay key for payments | `rzp_test_...` |
| `RAZORPAY_KEY_SECRET` | ❌ No | Razorpay secret for verification | `secret_...` |
| `SMTP_HOST` | ❌ No | SMTP server host | `smtp.gmail.com` |
| `SMTP_PORT` | ❌ No | SMTP server port | `587` |
| `SMTP_USERNAME` | ❌ No | SMTP username | `noreply@medicare.com` |
| `SMTP_PASSWORD` | ❌ No | SMTP password | `app_password` |

---

## 🎯 Demo Accounts

Use these credentials to explore different roles instantly:

| Role | Email | Password |
|:---|:---|:---|
| 🛡️ **Admin** | `admin@healthcare.com` | `password123` |
| 👨‍⚕️ **Doctor** | `doctor@demo.com` | `password123` |
| 👤 **Patient** | `patient@demo.com` | `password123` |

---

## 📖 API Documentation

Interactive Swagger UI is available once the backend is running:

```
🌐 http://localhost:8081/swagger-ui.html
```

All endpoints are documented with:
- 📋 Request/Response schemas
- 🔐 Authentication requirements
- 🛡️ Role-based access levels
- 📊 Auto-generated OpenAPI spec

---

<div align="center">

<br/>

### 🏥 Built with care for better healthcare accessibility 💙

<br/>

<p>
  <img src="https://img.shields.io/badge/Made%20With-❤️-ff69b4" />
  <img src="https://img.shields.io/badge/Open%20Source-✅-brightgreen" />
  <img src="https://img.shields.io/badge/License-MIT-blue" />
</p>

</div>
