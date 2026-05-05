package com.healthcare.service;

import com.healthcare.dto.request.PrescriptionRequest;
import com.healthcare.dto.request.DoseCompletionRequest;
import com.healthcare.dto.response.MedicationReminderResponse;
import com.healthcare.dto.response.PrescriptionResponse;
import com.healthcare.entity.*;
import com.healthcare.exception.*;
import com.healthcare.repository.*;
import com.itextpdf.io.font.constants.StandardFonts;
import com.itextpdf.io.image.ImageDataFactory;
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.events.PdfDocumentEvent;
import com.itextpdf.kernel.font.PdfFont;
import com.itextpdf.kernel.font.PdfFontFactory;
import com.itextpdf.kernel.geom.PageSize;
import com.itextpdf.kernel.pdf.*;
import com.itextpdf.kernel.pdf.canvas.PdfCanvas;
import com.itextpdf.kernel.pdf.canvas.draw.SolidLine;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.borders.Border;
import com.itextpdf.layout.borders.SolidBorder;
import com.itextpdf.layout.element.*;
import com.itextpdf.layout.properties.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class PrescriptionService {

        private final PrescriptionRepository prescriptionRepo;
        private final AppointmentRepository appointmentRepo;
        private final PatientRepository patientRepo;
        private final DoctorRepository doctorRepo;
        private final PrescriptionMedicineRepository prescriptionMedicineRepo;
        private final MedicationDoseLogRepository medicationDoseLogRepo;
        private final NotificationService notificationService;
        private final AuditLogService auditLogService;

        // ─── Design System ────────────────────────────────────────────────────────
        private static final DeviceRgb INK          = new DeviceRgb(14, 17, 22);
        private static final DeviceRgb TEAL         = new DeviceRgb(15, 85, 90);
        private static final DeviceRgb TEAL_DIM     = new DeviceRgb(60, 130, 126);
        private static final DeviceRgb SLATE        = new DeviceRgb(94, 106, 120);
        private static final DeviceRgb MUTED        = new DeviceRgb(95, 116, 135);
        private static final DeviceRgb GHOST        = new DeviceRgb(246, 248, 250);
        private static final DeviceRgb SURFACE      = new DeviceRgb(250, 252, 253);
        private static final DeviceRgb RULE         = new DeviceRgb(218, 224, 230);
        private static final DeviceRgb RULE_LIGHT   = new DeviceRgb(235, 238, 242);
        private static final DeviceRgb CLINICAL_BG  = new DeviceRgb(240, 247, 252);
        private static final DeviceRgb CLINICAL_BR  = new DeviceRgb(180, 210, 230);
        private static final DeviceRgb CLINICAL_TX  = new DeviceRgb(58, 90, 110);
        private static final DeviceRgb FOLLOW_BG    = new DeviceRgb(240, 248, 247);
        private static final DeviceRgb WHITE        = new DeviceRgb(255, 255, 255);
        private static final DeviceRgb RX_RED       = new DeviceRgb(149, 39, 39);

        // Dose slot labels
        private static final String[] DOSE_TIME_LABELS = { "08:00", "13:00", "20:00", "22:00" };

        // Page geometry
        private static final float MARGIN_H = 48f;
        private static final float MARGIN_T = 48f;
        private static final float MARGIN_B = 52f;

        // ─── CRUD & business logic ────────────────────────────────────────────────

        @Transactional
        public PrescriptionResponse addPrescription(PrescriptionRequest req, Long doctorUserId) {
                Appointment appointment = appointmentRepo.findById(req.getAppointmentId())
                                .orElseThrow(() -> new ResourceNotFoundException("Appointment",
                                                req.getAppointmentId()));
                if (!appointment.getDoctor().getUser().getId().equals(doctorUserId))
                        throw new BadRequestException("You can only add prescriptions for your own appointments.");
                if (prescriptionRepo.existsByAppointmentId(req.getAppointmentId()))
                        throw new ConflictException("Prescription already exists for this appointment.");

                Prescription prescription = Prescription.builder()
                                .appointment(appointment).doctor(appointment.getDoctor())
                                .patient(appointment.getPatient()).diagnosis(req.getDiagnosis())
                                .additionalNotes(req.getAdditionalNotes()).followUpDate(req.getFollowUpDate())
                                .build();

                if (req.getMedicines() != null) {
                        List<PrescriptionMedicine> meds = req.getMedicines().stream().map(m -> {
                                PrescriptionMedicine pm = new PrescriptionMedicine();
                                pm.setPrescription(prescription);
                                pm.setMedicineName(m.getMedicineName());
                                pm.setDosage(m.getDosage());
                                pm.setFrequency(m.getFrequency());
                                pm.setDuration(m.getDuration());
                                pm.setInstructions(m.getInstructions());
                                pm.setType(m.getType());
                                return pm;
                        }).toList();
                        prescription.setMedicines(meds);
                }

                Prescription saved = prescriptionRepo.save(prescription);
                byte[] prescriptionPdf = generatePrescriptionPdf(saved.getId());
                notificationService.sendPrescriptionNotification(
                                appointment.getPatient().getUser(), appointment.getDoctor().getUser().getName(),
                                prescriptionPdf);
                auditLogService.log(doctorUserId, "PRESCRIPTION_ADDED", "Prescription",
                                saved.getId(), "For appointment " + req.getAppointmentId());
                return mapToResponse(saved);
        }

        @Transactional(readOnly = true)
        public PrescriptionResponse getPrescription(Long id) {
                return prescriptionRepo.findById(id).map(this::mapToResponse)
                                .orElseThrow(() -> new ResourceNotFoundException("Prescription", id));
        }

        @Transactional(readOnly = true)
        public PrescriptionResponse getPrescriptionByAppointment(Long appointmentId) {
                return prescriptionRepo.findByAppointmentId(appointmentId).map(this::mapToResponse)
                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "No prescription found for appointment " + appointmentId));
        }

        @Transactional(readOnly = true)
        public List<PrescriptionResponse> getPatientPrescriptions(Long userId) {
                Patient patient = patientRepo.findByUserId(userId)
                                .orElseThrow(() -> new ResourceNotFoundException("Patient profile not found"));
                return prescriptionRepo.findByPatientIdOrderByCreatedAtDesc(patient.getId())
                                .stream().map(this::mapToResponse).toList();
        }

        @Transactional(readOnly = true)
        public List<PrescriptionResponse> getDoctorPrescriptions(Long userId) {
                Doctor doctor = doctorRepo.findByUserId(userId)
                                .orElseThrow(() -> new ResourceNotFoundException("Doctor profile not found"));
                return prescriptionRepo.findByDoctorIdOrderByCreatedAtDesc(doctor.getId())
                                .stream().map(this::mapToResponse).toList();
        }

        @Transactional(readOnly = true)
        public MedicationReminderResponse getPatientMedicationReminder(Long userId, LocalDate date) {
                Patient patient = patientRepo.findByUserId(userId)
                                .orElseThrow(() -> new ResourceNotFoundException("Patient profile not found"));

                List<Prescription> prescriptions = prescriptionRepo
                                .findByPatientIdOrderByCreatedAtDesc(patient.getId());
                List<MedicationDoseLog> logs = medicationDoseLogRepo.findByPatientIdAndDoseDate(patient.getId(), date);

                Map<String, MedicationDoseLog> logMap = new HashMap<>();
                for (MedicationDoseLog log : logs) {
                        String key = doseLogKey(log.getPrescriptionMedicine().getId(), log.getSlotIndex());
                        logMap.put(key, log);
                }

                List<MedicationReminderResponse.DoseSlotResponse> slots = new ArrayList<>();

                for (Prescription prescription : prescriptions) {
                        if (!Boolean.TRUE.equals(prescription.getIsActive()) || prescription.getCreatedAt() == null)
                                continue;
                        LocalDate prescriptionDate = prescription.getCreatedAt().toLocalDate();

                        for (PrescriptionMedicine medicine : prescription.getMedicines() == null
                                        ? List.<PrescriptionMedicine>of()
                                        : prescription.getMedicines()) {
                                int prescribedDays = parsePrescribedDays(medicine.getDuration());
                                LocalDate prescribedEndDate = prescriptionDate
                                                .plusDays(Math.max(1, prescribedDays) - 1L);

                                if (date.isBefore(prescriptionDate) || date.isAfter(prescribedEndDate))
                                        continue;

                                int dosesPerDay = getDoseCount(medicine.getFrequency());
                                int dayNumber = (int) ChronoUnit.DAYS.between(prescriptionDate, date) + 1;

                                for (int slotIndex = 0; slotIndex < dosesPerDay; slotIndex++) {
                                        String key = doseLogKey(medicine.getId(), slotIndex);
                                        MedicationDoseLog log = logMap.get(key);
                                        boolean taken = log != null && Boolean.TRUE.equals(log.getTaken());

                                        slots.add(MedicationReminderResponse.DoseSlotResponse.builder()
                                                        .slotKey(medicine.getId() + ":" + date + ":" + slotIndex)
                                                        .prescriptionId(prescription.getId())
                                                        .prescriptionMedicineId(medicine.getId())
                                                        .medicineName(medicine.getMedicineName())
                                                        .dosage(medicine.getDosage())
                                                        .frequency(medicine.getFrequency())
                                                        .duration(medicine.getDuration())
                                                        .prescribedDays(prescribedDays)
                                                        .dayNumber(dayNumber)
                                                        .prescriptionDate(prescriptionDate)
                                                        .prescribedEndDate(prescribedEndDate)
                                                        .timeLabel(DOSE_TIME_LABELS[slotIndex
                                                                        % DOSE_TIME_LABELS.length])
                                                        .slotIndex(slotIndex)
                                                        .taken(taken)
                                                        .takenAt(log != null ? log.getTakenAt() : null)
                                                        .build());
                                }
                        }
                }

                int completedSlots = (int) slots.stream().filter(s -> Boolean.TRUE.equals(s.getTaken())).count();
                return MedicationReminderResponse.builder()
                                .date(date).totalSlots(slots.size()).completedSlots(completedSlots).slots(slots)
                                .build();
        }

        @Transactional
        public MedicationReminderResponse updateDoseCompletion(Long userId, DoseCompletionRequest request) {
                Patient patient = patientRepo.findByUserId(userId)
                                .orElseThrow(() -> new ResourceNotFoundException("Patient profile not found"));

                PrescriptionMedicine medicine = prescriptionMedicineRepo.findById(request.getPrescriptionMedicineId())
                                .orElseThrow(() -> new ResourceNotFoundException("Prescription medicine",
                                                request.getPrescriptionMedicineId()));

                if (!medicine.getPrescription().getPatient().getId().equals(patient.getId()))
                        throw new BadRequestException("You can only update your own medication reminders.");

                LocalDate doseDate = request.getDoseDate() != null ? request.getDoseDate() : LocalDate.now();

                MedicationDoseLog existing = medicationDoseLogRepo
                                .findByPatientIdAndPrescriptionMedicineIdAndDoseDateAndSlotIndex(
                                                patient.getId(), medicine.getId(), doseDate, request.getSlotIndex())
                                .orElse(null);

                if (Boolean.TRUE.equals(request.getTaken())) {
                        MedicationDoseLog toSave = existing == null ? MedicationDoseLog.builder()
                                        .patient(patient).prescriptionMedicine(medicine)
                                        .doseDate(doseDate).slotIndex(request.getSlotIndex())
                                        .build() : existing;
                        toSave.setTaken(true);
                        toSave.setTakenAt(LocalDateTime.now());
                        medicationDoseLogRepo.save(toSave);
                } else if (existing != null) {
                        medicationDoseLogRepo.delete(existing);
                }

                return getPatientMedicationReminder(userId, doseDate);
        }

        // ═══════════════════════════════════════════════════════════════════════════
        // PDF GENERATION — Clinical Minimal Design
        // ═══════════════════════════════════════════════════════════════════════════

        @Transactional(readOnly = true)
        public byte[] generatePrescriptionPdf(Long prescriptionId) {
                Prescription p = prescriptionRepo.findById(prescriptionId)
                                .orElseThrow(() -> new ResourceNotFoundException("Prescription", prescriptionId));

                try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
                        PdfWriter writer = new PdfWriter(baos);
                        PdfDocument pdfDoc = new PdfDocument(writer);
                        Document document = new Document(pdfDoc, PageSize.A4);
                        document.setMargins(MARGIN_T, MARGIN_H, MARGIN_B, MARGIN_H);

                        PdfFont bold    = PdfFontFactory.createFont(StandardFonts.HELVETICA_BOLD);
                        PdfFont regular = PdfFontFactory.createFont(StandardFonts.HELVETICA);
                        PdfFont italic  = PdfFontFactory.createFont(StandardFonts.HELVETICA_OBLIQUE);

                        registerPageDecoration(pdfDoc, regular);

                        DateTimeFormatter dateFmt = DateTimeFormatter.ofPattern("dd MMMM yyyy");
                        LocalDateTime createdAt = p.getCreatedAt() != null ? p.getCreatedAt() : LocalDateTime.now();

                        // ── 1. MASTHEAD ───────────────────────────────────────────────────
                        document.add(buildMasthead(bold, regular, italic, p, createdAt, dateFmt));

                        // Full-width accent rule
                        document.add(new LineSeparator(new SolidLine(1.2f))
                                        .setStrokeColor(TEAL).setMarginBottom(22));

                        // ── 2. META STRIP ─────────────────────────────────────────────────
                        document.add(buildMetaStrip(bold, regular, p, createdAt));

                        // ── 3. PARTIES: Doctor | Patient ──────────────────────────────────
                        document.add(buildPartiesSection(bold, regular, p));

                        // ── 4. DIAGNOSIS BLOCK ────────────────────────────────────────────
                        document.add(buildDiagnosisBlock(bold, regular, p));

                        // ── 5. MEDICINES TABLE ────────────────────────────────────────────
                        if (p.getMedicines() != null && !p.getMedicines().isEmpty()) {
                                document.add(buildMedicinesSection(bold, regular, italic, p));
                        }

                        // ── 6. NOTES + FOLLOW-UP ──────────────────────────────────────────
                        document.add(buildNotesFollowUp(bold, regular, italic, p, dateFmt));

                        // ── 7. SIGNATURES ─────────────────────────────────────────────────
                        document.add(buildSignatures(bold, regular, italic, p));

                        document.close();
                        return baos.toByteArray();

                } catch (Exception e) {
                        log.error("PDF generation failed: ", e);
                        throw new BadRequestException("Failed to generate prescription PDF");
                }
        }

        // ─── Section: Masthead ────────────────────────────────────────────────────
        //
        // Layout: [ Logo (10%) | Brand block (60%) | Rx badge (30%) ]
        // Mirrors the appointment slip header — same logo loading, same fallback.
        // "Hospital" line removed: MediCare is a multi-hospital platform.
        // ─────────────────────────────────────────────────────────────────────────
        private Table buildMasthead(PdfFont bold, PdfFont regular, PdfFont italic,
                        Prescription p, LocalDateTime createdAt,
                        DateTimeFormatter dateFmt) {

                Table t = new Table(UnitValue.createPercentArray(new float[] { 10, 60, 30 }))
                                .useAllAvailableWidth().setMarginBottom(12);

                // ── Logo ──────────────────────────────────────────────────────────
                Cell logoCell = new Cell().setBorder(Border.NO_BORDER)
                                .setVerticalAlignment(VerticalAlignment.MIDDLE);
                logoCell.add(loadLogoImage(48, 48));
                t.addCell(logoCell);

                // ── Brand block ───────────────────────────────────────────────────
                Cell brand = new Cell().setBorder(Border.NO_BORDER)
                                .setVerticalAlignment(VerticalAlignment.BOTTOM);

                brand.add(new Paragraph("MediCare")
                                .setFont(bold).setFontSize(26f).setFontColor(TEAL)
                                .setCharacterSpacing(-0.3f).setMarginBottom(2));
                brand.add(new Paragraph("Comprehensive Clinical Care")
                                .setFont(regular).setFontSize(7.5f).setFontColor(MUTED).setMarginBottom(10));

                // Doctor identity line — hospital removed
                String docName = "Dr. " + p.getDoctor().getUser().getName();
                String spec    = nvl(p.getDoctor().getSpecialization());
                String qual    = p.getDoctor().getQualification() != null
                                ? "  ·  " + p.getDoctor().getQualification()
                                : "";
                brand.add(new Paragraph(docName + "  ·  " + spec + qual)
                                .setFont(bold).setFontSize(9.5f).setFontColor(INK).setMarginBottom(2));

                // Contact line — email only (no hospital field)
                String email = nvl(p.getDoctor().getUser().getEmail());
                brand.add(new Paragraph(email)
                                .setFont(regular).setFontSize(7.5f).setFontColor(MUTED));
                t.addCell(brand);

                // ── Rx Badge ──────────────────────────────────────────────────────
                Cell badgeCell = new Cell().setBorder(Border.NO_BORDER)
                                .setVerticalAlignment(VerticalAlignment.MIDDLE)
                                .setTextAlignment(TextAlignment.RIGHT);

                Div badge = new Div()
                                .setBackgroundColor(GHOST)
                                .setBorder(new SolidBorder(RULE, 0.8f))
                                .setBorderRadius(new BorderRadius(6))
                                .setPaddingTop(10).setPaddingBottom(10)
                                .setPaddingLeft(14).setPaddingRight(14)
                                .setWidth(160);
                badge.add(new Paragraph("PRESCRIPTION")
                                .setFont(bold).setFontSize(7f).setFontColor(TEAL)
                                .setTextAlignment(TextAlignment.CENTER).setMargin(0).setMarginBottom(4));
                badge.add(new Paragraph("℞  " + String.format("RX-%05d", p.getId()))
                                .setFont(bold).setFontSize(11f).setFontColor(RX_RED)
                                .setTextAlignment(TextAlignment.CENTER).setMargin(0));
                badgeCell.add(badge);
                t.addCell(badgeCell);

                return t;
        }

        // ─── Section: Meta strip ──────────────────────────────────────────────────
        private Table buildMetaStrip(PdfFont bold, PdfFont regular,
                        Prescription p, LocalDateTime createdAt) {
                Table t = new Table(UnitValue.createPercentArray(new float[] { 34, 33, 33 }))
                                .useAllAvailableWidth().setMarginBottom(24)
                                .setBackgroundColor(GHOST);

                DateTimeFormatter dateFmt = DateTimeFormatter.ofPattern("dd MMM yyyy");

                t.addCell(metaCell(bold, regular, "Prescription No.",
                                String.format("RX-%05d", p.getId()), TextAlignment.LEFT));
                t.addCell(metaCell(bold, regular, "Issued On",
                                createdAt.format(dateFmt), TextAlignment.CENTER));
                t.addCell(metaCell(bold, regular, "Registration",
                                "MC-" + createdAt.getYear() + "-" + String.format("%04d", p.getId()),
                                TextAlignment.RIGHT));

                return t;
        }

        private Cell metaCell(PdfFont bold, PdfFont regular, String label, String value, TextAlignment align) {
                Cell c = new Cell().setBorder(Border.NO_BORDER)
                                .setPaddingTop(10).setPaddingBottom(10)
                                .setPaddingLeft(12).setPaddingRight(12);
                c.add(new Paragraph(label)
                                .setFont(regular).setFontSize(6.5f).setFontColor(MUTED)
                                .setCharacterSpacing(0.8f).setTextAlignment(align).setMarginBottom(4));
                c.add(new Paragraph(value)
                                .setFont(bold).setFontSize(10.5f).setFontColor(INK)
                                .setTextAlignment(align));
                return c;
        }

        // ─── Section: Doctor + Patient cards ──────────────────────────────────────
        //
        // "Hospital" row removed from the doctor card — doctors on MediCare are
        // not tied to a single hospital, so displaying one would be misleading.
        // ─────────────────────────────────────────────────────────────────────────
        private Table buildPartiesSection(PdfFont bold, PdfFont regular, Prescription p) {
                Table t = new Table(UnitValue.createPercentArray(new float[] { 49, 2, 49 }))
                                .useAllAvailableWidth().setMarginBottom(22);

                Cell doc = buildPartyCard(bold, regular, "PRESCRIBING PHYSICIAN", TEAL, new String[][] {
                                { "Name",           "Dr. " + p.getDoctor().getUser().getName() },
                                { "Specialization", nvl(p.getDoctor().getSpecialization()) },
                                { "Qualification",  nvl(p.getDoctor().getQualification()) },
                                { "Contact",        nvl(p.getDoctor().getUser().getEmail()) },
                });
                t.addCell(doc);

                t.addCell(new Cell().setBorder(Border.NO_BORDER));

                Cell pat = buildPartyCard(bold, regular, "PATIENT", SLATE, new String[][] {
                                { "Name",        p.getPatient().getUser().getName() },
                                { "Email",       p.getPatient().getUser().getEmail() },
                                { "Phone",       nvl(p.getPatient().getUser().getPhone()) },
                                { "Blood Group", nvl(p.getPatient().getBloodGroup()) },
                                { "Allergies",   nvl(p.getPatient().getAllergies()) },
                });
                t.addCell(pat);

                return t;
        }

        private Cell buildPartyCard(PdfFont bold, PdfFont regular, String heading,
                        DeviceRgb accentColor, String[][] rows) {
                Cell cell = new Cell()
                                .setBorder(Border.NO_BORDER)
                                .setBackgroundColor(SURFACE)
                                .setBorderLeft(new SolidBorder(accentColor, 3f))
                                .setPaddingLeft(14).setPaddingRight(14)
                                .setPaddingTop(12).setPaddingBottom(12);

                cell.add(new Paragraph(heading)
                                .setFont(bold).setFontSize(6.5f).setFontColor(accentColor)
                                .setCharacterSpacing(0.9f).setMarginBottom(10));

                for (String[] row : rows) {
                        Table rt = new Table(UnitValue.createPercentArray(new float[] { 35, 65 }))
                                        .useAllAvailableWidth().setMarginBottom(5);
                        rt.addCell(new Cell().setBorder(Border.NO_BORDER).setPadding(0)
                                        .add(new Paragraph(row[0])
                                                        .setFont(regular).setFontSize(7.5f).setFontColor(MUTED)));
                        rt.addCell(new Cell().setBorder(Border.NO_BORDER).setPadding(0)
                                        .add(new Paragraph(row[1])
                                                        .setFont(bold).setFontSize(8.5f).setFontColor(INK)));
                        cell.add(rt);
                }
                return cell;
        }

        // ─── Section: Diagnosis ───────────────────────────────────────────────────
        private Table buildDiagnosisBlock(PdfFont bold, PdfFont regular, Prescription p) {
                Table t = new Table(UnitValue.createPercentArray(new float[] { 100 }))
                                .useAllAvailableWidth().setMarginBottom(22);

                Cell c = new Cell()
                                .setBackgroundColor(CLINICAL_BG)
                                .setBorder(Border.NO_BORDER)
                                .setBorderLeft(new SolidBorder(CLINICAL_BR, 4f))
                                .setPaddingLeft(16).setPaddingRight(16)
                                .setPaddingTop(14).setPaddingBottom(14);

                c.add(new Paragraph("DIAGNOSIS")
                                .setFont(bold).setFontSize(6.5f).setFontColor(CLINICAL_TX)
                                .setCharacterSpacing(0.9f).setMarginBottom(6));
                c.add(new Paragraph(p.getDiagnosis())
                                .setFont(bold).setFontSize(13.5f).setFontColor(INK)
                                .setFixedLeading(19f));
                t.addCell(c);
                return t;
        }

        // ─── Section: Medicines table ──────────────────────────────────────────────
        private Table buildMedicinesSection(PdfFont bold, PdfFont regular, PdfFont italic,
                        Prescription p) {
                Table combined = new Table(UnitValue.createPercentArray(new float[] { 100 }))
                                .useAllAvailableWidth().setMarginBottom(22);

                Cell wc = new Cell().setBorder(Border.NO_BORDER).setPadding(0);
                wc.add(new Paragraph("PRESCRIBED MEDICINES")
                                .setFont(bold).setFontSize(6.5f).setFontColor(TEAL)
                                .setCharacterSpacing(0.9f).setMarginBottom(10));

                float[] colWidths = { 170, 58, 90, 68, 120 };
                Table medTable = new Table(UnitValue.createPointArray(colWidths))
                                .useAllAvailableWidth();

                String[] headers = { "Medicine", "Dosage", "Frequency", "Duration", "Instructions" };
                for (int i = 0; i < headers.length; i++) {
                        Cell hc = new Cell()
                                        .setBackgroundColor(TEAL)
                                        .setBorder(Border.NO_BORDER)
                                        .setPaddingTop(9).setPaddingBottom(9)
                                        .setPaddingLeft(10).setPaddingRight(10);
                        hc.add(new Paragraph(headers[i])
                                        .setFont(bold).setFontSize(7.5f).setFontColor(WHITE)
                                        .setCharacterSpacing(0.3f)
                                        .setTextAlignment(i == 0 ? TextAlignment.LEFT : TextAlignment.CENTER));
                        medTable.addHeaderCell(hc);
                }

                boolean alt = false;
                for (PrescriptionMedicine med : p.getMedicines()) {
                        DeviceRgb rowBg = alt ? GHOST : WHITE;

                        Cell nameCell = new Cell()
                                        .setBackgroundColor(rowBg)
                                        .setBorder(Border.NO_BORDER)
                                        .setBorderBottom(new SolidBorder(RULE_LIGHT, 0.5f))
                                        .setPaddingTop(9).setPaddingBottom(9).setPaddingLeft(10).setPaddingRight(10);
                        nameCell.add(new Paragraph(med.getMedicineName())
                                        .setFont(bold).setFontSize(9f).setFontColor(INK).setMarginBottom(2));
                        if (med.getType() != null)
                                nameCell.add(new Paragraph(med.getType())
                                                .setFont(italic).setFontSize(7f).setFontColor(TEAL_DIM));
                        medTable.addCell(nameCell);

                        medTable.addCell(medDataCell(nvl(med.getDosage()),       regular, rowBg, TextAlignment.CENTER));
                        medTable.addCell(medDataCell(nvl(med.getFrequency()),    regular, rowBg, TextAlignment.CENTER));
                        medTable.addCell(medDataCell(nvl(med.getDuration()),     regular, rowBg, TextAlignment.CENTER));
                        medTable.addCell(medDataCell(nvl(med.getInstructions()), regular, rowBg, TextAlignment.LEFT));
                        alt = !alt;
                }

                wc.add(medTable);
                combined.addCell(wc);
                return combined;
        }

        private Cell medDataCell(String text, PdfFont font, DeviceRgb bg, TextAlignment align) {
                return new Cell()
                                .setBackgroundColor(bg)
                                .setBorder(Border.NO_BORDER)
                                .setBorderBottom(new SolidBorder(RULE_LIGHT, 0.5f))
                                .setVerticalAlignment(VerticalAlignment.MIDDLE)
                                .setPaddingTop(9).setPaddingBottom(9).setPaddingLeft(8).setPaddingRight(8)
                                .add(new Paragraph(text)
                                                .setFont(font).setFontSize(8f).setFontColor(INK)
                                                .setFixedLeading(11f)
                                                .setTextAlignment(align));
        }

        // ─── Section: Notes + Follow-up ───────────────────────────────────────────
        private Table buildNotesFollowUp(PdfFont bold, PdfFont regular, PdfFont italic,
                        Prescription p, DateTimeFormatter dateFmt) {
                Table t = new Table(UnitValue.createPercentArray(new float[] { 60, 5, 35 }))
                                .useAllAvailableWidth().setMarginBottom(26);

                Cell notes = new Cell()
                                .setBorder(new SolidBorder(RULE, 0.6f))
                                .setBackgroundColor(GHOST)
                                .setPadding(14);
                notes.add(new Paragraph("ADDITIONAL NOTES")
                                .setFont(bold).setFontSize(6.5f).setFontColor(MUTED)
                                .setCharacterSpacing(0.9f).setMarginBottom(8));
                String notesText = (p.getAdditionalNotes() != null && !p.getAdditionalNotes().isBlank())
                                ? p.getAdditionalNotes()
                                : "No additional notes recorded.";
                notes.add(new Paragraph(notesText)
                                .setFont(italic).setFontSize(9f).setFontColor(INK).setFixedLeading(15f));
                t.addCell(notes);

                t.addCell(new Cell().setBorder(Border.NO_BORDER));

                Cell fu = new Cell()
                                .setBorder(new SolidBorder(TEAL, 1.2f))
                                .setBackgroundColor(FOLLOW_BG)
                                .setPadding(16)
                                .setVerticalAlignment(VerticalAlignment.MIDDLE)
                                .setTextAlignment(TextAlignment.CENTER);

                fu.add(new Paragraph("FOLLOW-UP")
                                .setFont(bold).setFontSize(6.5f).setFontColor(TEAL)
                                .setCharacterSpacing(0.9f).setTextAlignment(TextAlignment.CENTER).setMarginBottom(10));

                if (p.getFollowUpDate() != null) {
                        fu.add(new Paragraph(p.getFollowUpDate().format(dateFmt))
                                        .setFont(bold).setFontSize(14f).setFontColor(TEAL)
                                        .setTextAlignment(TextAlignment.CENTER).setFixedLeading(18f)
                                        .setMarginBottom(8));
                        fu.add(new Paragraph("Bring all reports & medication records.")
                                        .setFont(regular).setFontSize(7.5f).setFontColor(MUTED)
                                        .setTextAlignment(TextAlignment.CENTER).setFixedLeading(12f));
                } else {
                        fu.add(new Paragraph("As Required")
                                        .setFont(bold).setFontSize(14f).setFontColor(TEAL)
                                        .setTextAlignment(TextAlignment.CENTER));
                }
                t.addCell(fu);

                return t;
        }

        // ─── Section: Signatures ──────────────────────────────────────────────────
        private Table buildSignatures(PdfFont bold, PdfFont regular, PdfFont italic, Prescription p) {
                Table t = new Table(UnitValue.createPercentArray(new float[] { 44, 12, 44 }))
                                .useAllAvailableWidth().setMarginBottom(6);

                String docName = "Dr. " + p.getDoctor().getUser().getName();
                String spec    = nvl(p.getDoctor().getSpecialization());

                t.addCell(sigCell(bold, regular, "Patient / Guardian", p.getPatient().getUser().getName(), INK, SLATE));
                t.addCell(new Cell().setBorder(Border.NO_BORDER));
                t.addCell(sigCell(bold, regular, "Physician Signature & Seal", docName + "  ·  " + spec, TEAL, TEAL));

                return t;
        }

        private Cell sigCell(PdfFont bold, PdfFont regular, String label, String name,
                        DeviceRgb nameColor, DeviceRgb lineColor) {
                Cell c = new Cell().setBorder(Border.NO_BORDER);
                c.add(new LineSeparator(new SolidLine(0.6f)).setStrokeColor(lineColor).setMarginBottom(22));
                c.add(new Paragraph(label)
                                .setFont(regular).setFontSize(7.5f).setFontColor(MUTED).setMarginBottom(3));
                c.add(new Paragraph(name)
                                .setFont(bold).setFontSize(8.5f).setFontColor(nameColor)
                                .setTextAlignment(TextAlignment.CENTER));
                return c;
        }

        // ─── Page decoration ──────────────────────────────────────────────────────
        private void registerPageDecoration(PdfDocument pdfDoc, PdfFont regular) {
                pdfDoc.addEventHandler(PdfDocumentEvent.END_PAGE, event -> {
                        PdfDocumentEvent docEvent = (PdfDocumentEvent) event;
                        PdfPage page = docEvent.getPage();
                        PdfCanvas canvas = new PdfCanvas(page);
                        try {
                                float w   = PageSize.A4.getWidth();
                                float h   = PageSize.A4.getHeight();
                                float bh  = 3.5f;

                                canvas.setFillColor(TEAL)
                                                .rectangle(0, h - bh, w, bh).fill();

                                canvas.setStrokeColor(RULE).setLineWidth(0.5f)
                                                .rectangle(18, 18, w - 36, h - 36 - bh).stroke();

                                float footerY = 18f;
                                float footerH = 20f;
                                canvas.setFillColor(GHOST)
                                                .rectangle(18, footerY, w - 36, footerH).fill();

                                canvas.setFillColor(MUTED).setFontAndSize(regular, 6.5f)
                                                .beginText()
                                                .moveText(26, footerY + 7)
                                                .showText("MediCare Smart Healthcare  ·  Electronically generated prescription")
                                                .endText();

                                canvas.setFillColor(MUTED).setFontAndSize(regular, 6.5f)
                                                .beginText()
                                                .moveText(w - 220, footerY + 7)
                                                .showText("For queries, contact the prescribing physician")
                                                .endText();

                        } catch (Exception ex) {
                                log.warn("Page decoration error: {}", ex.getMessage());
                        } finally {
                                canvas.release();
                        }
                });
        }

        // ═══════════════════════════════════════════════════════════════════════════
        // LOGO — same loading strategy as AppointmentSlipPdfService
        // ═══════════════════════════════════════════════════════════════════════════

        /**
         * Attempts to load MediCare_logo.png from the classpath first,
         * then falls back to a few common filesystem paths.
         * If no image is found, returns a transparent 1×1 placeholder so layout
         * is preserved without throwing.
         */
        private Image loadLogoImage(float w, float h) {
                byte[] logoBytes = null;

                // 1. Classpath (JAR / Spring Boot resources)
                try {
                        ClassPathResource res = new ClassPathResource("static/MediCare_logo.png");
                        try (InputStream is = res.getInputStream()) {
                                logoBytes = is.readAllBytes();
                        }
                } catch (Exception ignored) {
                }

                // 2. Filesystem fallbacks (dev-time convenience)
                if (logoBytes == null) {
                        for (String path : new String[] {
                                        "MediCare_logo.png",
                                        "MediCare logo.png",
                                        "src/main/resources/static/MediCare_logo.png" }) {
                                try {
                                        java.io.File f = new java.io.File(path);
                                        if (f.exists()) {
                                                logoBytes = java.nio.file.Files.readAllBytes(f.toPath());
                                                break;
                                        }
                                } catch (Exception ignored) {
                                }
                        }
                }

                if (logoBytes != null) {
                        try {
                                Image img = new Image(ImageDataFactory.create(logoBytes));
                                img.setWidth(w).setHeight(h).setAutoScale(false);
                                return img;
                        } catch (Exception e) {
                                log.warn("Logo image could not be decoded, using placeholder");
                        }
                }

                return buildLogoFallback(w, h);
        }

        /** Minimal 1×1 transparent PNG so iText never throws on a missing logo. */
        private Image buildLogoFallback(float w, float h) {
                try {
                        byte[] minPng = new byte[] {
                                        (byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
                                        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
                                        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
                                        0x08, 0x02, 0x00, 0x00, 0x00, (byte) 0x90, 0x77, 0x53, (byte) 0xDE,
                                        0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, 0x54,
                                        0x08, (byte) 0xD7, 0x63, (byte) 0xF8, (byte) 0xCF, (byte) 0xC0, 0x00, 0x00,
                                        0x00, 0x02, 0x00, 0x01, (byte) 0xE2, 0x21, (byte) 0xBC, 0x33,
                                        0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, (byte) 0xAE, 0x42, 0x60,
                                        (byte) 0x82
                        };
                        Image img = new Image(ImageDataFactory.create(minPng));
                        img.setWidth(w).setHeight(h);
                        return img;
                } catch (Exception e) {
                        throw new IllegalStateException("Cannot create logo fallback", e);
                }
        }

        // ─── Helpers ──────────────────────────────────────────────────────────────

        private String nvl(String v) {
                return (v != null && !v.isBlank()) ? v : "—";
        }

        private int getDoseCount(String frequency) {
                String text = frequency == null ? "" : frequency.toLowerCase();
                if (text.matches(".*(three|thrice|3\\s*x|tid).*")) return 3;
                if (text.matches(".*(twice|2\\s*x|bid).*"))        return 2;
                if (text.matches(".*(four|4\\s*x|qid).*"))         return 4;
                return 1;
        }

        private int parsePrescribedDays(String duration) {
                if (duration == null || duration.isBlank()) return 1;
                Matcher m = Pattern.compile("(\\d+)").matcher(duration);
                if (m.find()) return Math.max(1, Integer.parseInt(m.group(1)));
                String text = duration.toLowerCase();
                if (text.contains("week"))  return 7;
                if (text.contains("month")) return 30;
                return 1;
        }

        private String doseLogKey(Long medicineId, Integer slotIndex) {
                return medicineId + "-" + slotIndex;
        }

        // ─── Mapper ───────────────────────────────────────────────────────────────
        private PrescriptionResponse mapToResponse(Prescription p) {
                List<PrescriptionResponse.MedicineResponse> meds = p.getMedicines() == null ? List.of()
                                : p.getMedicines().stream().map(m -> PrescriptionResponse.MedicineResponse.builder()
                                                .id(m.getId()).medicineName(m.getMedicineName()).dosage(m.getDosage())
                                                .frequency(m.getFrequency()).duration(m.getDuration())
                                                .instructions(m.getInstructions()).type(m.getType()).build()).toList();

                return PrescriptionResponse.builder()
                                .id(p.getId()).appointmentId(p.getAppointment().getId())
                                .doctorName(p.getDoctor().getUser().getName())
                                .doctorSpecialization(p.getDoctor().getSpecialization())
                                .doctorQualification(p.getDoctor().getQualification())
                                .patientName(p.getPatient().getUser().getName())
                                .patientEmail(p.getPatient().getUser().getEmail())
                                .diagnosis(p.getDiagnosis()).medicines(meds)
                                .additionalNotes(p.getAdditionalNotes()).followUpDate(p.getFollowUpDate())
                                .createdAt(p.getCreatedAt()).build();
        }
}