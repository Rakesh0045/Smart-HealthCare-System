package com.healthcare.service;

import com.healthcare.dto.request.PrescriptionRequest;
import com.healthcare.dto.response.PrescriptionResponse;
import com.healthcare.entity.*;
import com.healthcare.exception.*;
import com.healthcare.repository.*;
import com.itextpdf.io.font.constants.StandardFonts;
import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.kernel.colors.DeviceRgb;
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
import com.itextpdf.kernel.events.PdfDocumentEvent;
import com.itextpdf.layout.properties.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class PrescriptionService {

        private final PrescriptionRepository prescriptionRepo;
        private final AppointmentRepository appointmentRepo;
        private final PatientRepository patientRepo;
        private final DoctorRepository doctorRepo;
        private final NotificationService notificationService;
        private final AuditLogService auditLogService;

        // ─── MediCare Brand Palette ───────────────────────────────────────────────
        // Primary teal (matches sidebar/portal accent)
        private static final DeviceRgb TEAL = new DeviceRgb(13, 148, 136);
        private static final DeviceRgb TEAL_DARK = new DeviceRgb(15, 118, 110);
        private static final DeviceRgb TEAL_LIGHT = new DeviceRgb(240, 253, 250);
        private static final DeviceRgb TEAL_MID = new DeviceRgb(204, 251, 241);
        private static final DeviceRgb TEAL_BORDER = new DeviceRgb(153, 246, 228);

        // Secondary blue (patient portal accent)
        private static final DeviceRgb BLUE = new DeviceRgb(37, 99, 235);
        private static final DeviceRgb BLUE_LIGHT = new DeviceRgb(239, 246, 255);
        private static final DeviceRgb BLUE_MID = new DeviceRgb(191, 219, 254);

        // Purple (follow-up / action accent)
        private static final DeviceRgb PURPLE = new DeviceRgb(124, 58, 237);
        private static final DeviceRgb PURPLE_BG = new DeviceRgb(245, 243, 255);
        private static final DeviceRgb PURPLE_MID = new DeviceRgb(221, 214, 254);

        // Amber (diagnosis highlight)
        private static final DeviceRgb AMBER_BG = new DeviceRgb(255, 251, 235);
        private static final DeviceRgb AMBER_BORDER = new DeviceRgb(253, 230, 138);
        private static final DeviceRgb AMBER_TXT = new DeviceRgb(146, 64, 14);
        private static final DeviceRgb AMBER_DARK = new DeviceRgb(120, 53, 15);

        // Neutrals
        private static final DeviceRgb DARK = new DeviceRgb(15, 23, 42);
        private static final DeviceRgb SLATE_700 = new DeviceRgb(51, 65, 85);
        private static final DeviceRgb SLATE_500 = new DeviceRgb(100, 116, 139);
        private static final DeviceRgb SLATE_400 = new DeviceRgb(148, 163, 184);
        private static final DeviceRgb SLATE_200 = new DeviceRgb(226, 232, 240);
        private static final DeviceRgb SLATE_50 = new DeviceRgb(248, 250, 252);
        private static final DeviceRgb WHITE = new DeviceRgb(255, 255, 255);

        // Red (Rx symbol)
        private static final DeviceRgb RED = new DeviceRgb(239, 68, 68);

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
                                .appointment(appointment)
                                .doctor(appointment.getDoctor())
                                .patient(appointment.getPatient())
                                .diagnosis(req.getDiagnosis())
                                .additionalNotes(req.getAdditionalNotes())
                                .followUpDate(req.getFollowUpDate())
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
                notificationService.sendPrescriptionNotification(
                                appointment.getPatient().getUser(),
                                appointment.getDoctor().getUser().getName());
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

        // ─── PDF Generation ───────────────────────────────────────────────────────

        @Transactional(readOnly = true)
        public byte[] generatePrescriptionPdf(Long prescriptionId) {
                Prescription p = prescriptionRepo.findById(prescriptionId)
                                .orElseThrow(() -> new ResourceNotFoundException("Prescription", prescriptionId));

                try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {

                        PdfWriter writer = new PdfWriter(baos);
                        PdfDocument pdfDoc = new PdfDocument(writer);
                        Document document = new Document(pdfDoc, PageSize.A4);

                        // Margin: top/right/bottom/left — bottom is enlarged for the footer bar
                        document.setMargins(22, 22, 32, 22);

                        PdfFont bold = PdfFontFactory.createFont(StandardFonts.HELVETICA_BOLD);
                        PdfFont regular = PdfFontFactory.createFont(StandardFonts.HELVETICA);
                        PdfFont oblique = PdfFontFactory.createFont(StandardFonts.HELVETICA_OBLIQUE);

                        // ── Page decoration (border + footer bar) — fires on every page ─────
                        addPageDecoration(pdfDoc, regular);

                        // ── 1. HEADER ────────────────────────────────────────────────────────
                        buildHeader(document, p, bold, regular);

                        // Thick teal divider
                        document.add(new LineSeparator(new SolidLine(2.5f))
                                        .setStrokeColor(TEAL).setMarginTop(0).setMarginBottom(8));

                        // ── 2. META BAR (prescription number + date) ─────────────────────────
                        buildMetaBar(document, p, bold, regular);

                        // ── 3. DOCTOR / PATIENT BLOCKS ───────────────────────────────────────
                        buildInfoRow(document, p, bold, regular);

                        // ── 4. DIAGNOSIS ─────────────────────────────────────────────────────
                        buildDiagnosis(document, p, bold, regular);

                        // ── 5. MEDICINES TABLE ───────────────────────────────────────────────
                        if (p.getMedicines() != null && !p.getMedicines().isEmpty()) {
                                buildMedicinesTable(document, p, bold, regular);
                        }

                        document.add(new Paragraph(" ").setHeight(10));

                        // ── 6. NOTES + FOLLOW-UP ─────────────────────────────────────────────
                        buildNotesAndFollowUp(document, p, bold, regular, oblique);

                        document.add(new Paragraph(" ").setHeight(14));

                        // ── 7. SIGNATURES ────────────────────────────────────────────────────
                        buildSignatures(document, p, bold, regular);

                        document.close();
                        return baos.toByteArray();

                } catch (Exception e) {
                        log.error("PDF generation failed: ", e);
                        throw new BadRequestException("Failed to generate prescription PDF");
                }
        }

        // ─── Section builders ─────────────────────────────────────────────────────

        /**
         * Branded header: logo block + clinic info + large Rx symbol.
         */
        private void buildHeader(Document doc, Prescription p,
                        PdfFont bold, PdfFont regular) {

                String docName = "Dr. " + p.getDoctor().getUser().getName();
                String spec = nvl(p.getDoctor().getSpecialization());
                String hosp = p.getDoctor().getHospital() != null ? p.getDoctor().getHospital() + "  •  " : "";
                String email = p.getDoctor().getUser().getEmail();

                Table header = new Table(UnitValue.createPercentArray(new float[] { 11, 71, 18 }))
                                .useAllAvailableWidth().setMarginBottom(6);

                // ── Logo box ──
                Cell logoCell = new Cell().setBorder(Border.NO_BORDER)
                                .setVerticalAlignment(VerticalAlignment.MIDDLE);
                logoCell.add(buildLogoBox(bold));
                header.addCell(logoCell);

                // ── Clinic text ──
                Cell clinicCell = new Cell().setBorder(Border.NO_BORDER)
                                .setVerticalAlignment(VerticalAlignment.MIDDLE)
                                .setPaddingLeft(12);

                clinicCell.add(new Paragraph("MediCare")
                                .setFont(bold).setFontSize(24).setFontColor(TEAL).setMarginBottom(1));
                clinicCell.add(new Paragraph("Smart Healthcare System")
                                .setFont(regular).setFontSize(8).setFontColor(SLATE_500).setMarginBottom(5));
                clinicCell.add(new Paragraph(docName + "  |  " + spec)
                                .setFont(bold).setFontSize(10.5f).setFontColor(DARK).setMarginBottom(2));
                clinicCell.add(new Paragraph(hosp + email)
                                .setFont(regular).setFontSize(8).setFontColor(SLATE_500));
                header.addCell(clinicCell);

                // ── Rx symbol ──
                Cell rxCell = new Cell().setBorder(Border.NO_BORDER)
                                .setVerticalAlignment(VerticalAlignment.MIDDLE)
                                .setTextAlignment(TextAlignment.RIGHT);
                rxCell.add(new Paragraph("\u211E") // ℞ unicode
                                .setFont(bold).setFontSize(60)
                                .setFontColor(RED)
                                .setTextAlignment(TextAlignment.RIGHT)
                                .setMarginBottom(0));
                header.addCell(rxCell);

                doc.add(header);
        }

        /**
         * Teal pill bar: prescription number, date, registration.
         */
        private void buildMetaBar(Document doc, Prescription p,
                        PdfFont bold, PdfFont regular) {

                DateTimeFormatter dtf = DateTimeFormatter.ofPattern("dd MMMM yyyy");
                LocalDateTime createdAt = p.getCreatedAt() != null ? p.getCreatedAt() : LocalDateTime.now();

                String rxNo = String.format("RX-%05d", p.getId());
                String regNo = "MC-" + createdAt.getYear() + "-" + String.format("%03d", p.getId());
                String date = createdAt.format(dtf);

                // Single-row table styled as a teal pill bar
                Table bar = new Table(UnitValue.createPercentArray(new float[] { 33, 34, 33 }))
                                .useAllAvailableWidth().setMarginBottom(10);

                for (String[] kv : new String[][] { { "Prescription No.", rxNo }, { "Date", date },
                                { "Reg. No.", regNo } }) {
                        Cell c = new Cell()
                                        .setBackgroundColor(TEAL)
                                        .setBorder(Border.NO_BORDER)
                                        .setPaddingTop(7).setPaddingBottom(7).setPaddingLeft(12).setPaddingRight(12);
                        c.add(new Paragraph(kv[0])
                                        .setFont(regular).setFontSize(7)
                                        .setFontColor(TEAL_MID).setMarginBottom(2));
                        c.add(new Paragraph(kv[1])
                                        .setFont(bold).setFontSize(9.5f)
                                        .setFontColor(WHITE));
                        bar.addCell(c);
                }
                // Rounded corners via thin border trick — add hairline between cols
                doc.add(bar);
        }

        /**
         * Two-column doctor / patient info blocks.
         */
        private void buildInfoRow(Document doc, Prescription p,
                        PdfFont bold, PdfFont regular) {

                String docName = "Dr. " + p.getDoctor().getUser().getName();
                String spec = nvl(p.getDoctor().getSpecialization());

                Table row = new Table(UnitValue.createPercentArray(new float[] { 50, 50 }))
                                .useAllAvailableWidth().setMarginBottom(12);

                // Doctor block — teal theme
                row.addCell(buildInfoBlock(bold, regular,
                                "DOCTOR DETAILS", TEAL, TEAL_LIGHT, TEAL_BORDER,
                                new String[][] { { "Name", docName },
                                                { "Specialization", spec },
                                                { "Qualification", nvl(p.getDoctor().getQualification()) },
                                                { "Hospital", nvl(p.getDoctor().getHospital()) },
                                                { "Phone", nvl(p.getDoctor().getUser().getPhone()) },
                                                { "Email", p.getDoctor().getUser().getEmail() } }));

                // Patient block — blue theme
                row.addCell(buildInfoBlock(bold, regular,
                                "PATIENT DETAILS", BLUE, BLUE_LIGHT, BLUE_MID,
                                new String[][] { { "Name", p.getPatient().getUser().getName() },
                                                { "Email", p.getPatient().getUser().getEmail() },
                                                { "Phone", nvl(p.getPatient().getUser().getPhone()) },
                                                { "Blood Group", nvl(p.getPatient().getBloodGroup()) },
                                                { "Allergies", nvl(p.getPatient().getAllergies()) } }));

                doc.add(row);
        }

        /**
         * Amber diagnosis card.
         */
        private void buildDiagnosis(Document doc, Prescription p,
                        PdfFont bold, PdfFont regular) {

                Table t = new Table(UnitValue.createPercentArray(new float[] { 100 }))
                                .useAllAvailableWidth().setMarginBottom(12);

                Cell c = new Cell()
                                .setBackgroundColor(AMBER_BG)
                                .setBorder(new SolidBorder(AMBER_BORDER, 1f))
                                .setPadding(12);

                // Label row with amber bullet
                Table labelRow = new Table(UnitValue.createPercentArray(new float[] { 8, 92 }))
                                .useAllAvailableWidth();
                Cell bullet = new Cell().setBorder(Border.NO_BORDER);
                bullet.add(new Paragraph("\u25CF") // ● filled circle
                                .setFont(bold).setFontSize(11).setFontColor(new DeviceRgb(217, 119, 6)));
                labelRow.addCell(bullet);
                Cell labelCell = new Cell().setBorder(Border.NO_BORDER);
                labelCell.add(new Paragraph("DIAGNOSIS")
                                .setFont(bold).setFontSize(8)
                                .setFontColor(AMBER_TXT).setMarginTop(1));
                labelRow.addCell(labelCell);
                c.add(labelRow);

                c.add(new Paragraph(p.getDiagnosis())
                                .setFont(bold).setFontSize(12)
                                .setFontColor(AMBER_DARK).setMarginTop(4));
                t.addCell(c);
                doc.add(t);
        }

        /**
         * Full-width medicines table with alternating teal rows.
         */
        private void buildMedicinesTable(Document doc, Prescription p,
                        PdfFont bold, PdfFont regular) {

                // Section label
                Table labelRow = new Table(UnitValue.createPercentArray(new float[] { 5, 95 }))
                                .useAllAvailableWidth().setMarginBottom(6);
                Cell dot = new Cell().setBorder(Border.NO_BORDER);
                dot.add(new Paragraph("\u25B6") // ▶ triangle
                                .setFont(bold).setFontSize(8).setFontColor(TEAL));
                labelRow.addCell(dot);
                Cell lbl = new Cell().setBorder(Border.NO_BORDER);
                lbl.add(new Paragraph("PRESCRIBED MEDICINES")
                                .setFont(bold).setFontSize(8.5f).setFontColor(TEAL));
                labelRow.addCell(lbl);
                doc.add(labelRow);

                // Table with fixed point widths for clean column proportions
                float[] colWidths = { 140, 55, 95, 65, 130 };
                Table tbl = new Table(UnitValue.createPointArray(colWidths)).useAllAvailableWidth();

                // Header row — dark teal background
                String[] headers = { "Medicine / Type", "Dosage", "Frequency", "Duration", "Instructions" };
                for (String h : headers) {
                        boolean isFirst = h.equals(headers[0]);
                        Cell hc = new Cell()
                                        .setBackgroundColor(TEAL_DARK)
                                        .setBorder(Border.NO_BORDER)
                                        .setPaddingTop(9).setPaddingBottom(9)
                                        .setPaddingLeft(isFirst ? 10 : 6).setPaddingRight(6);
                        hc.add(new Paragraph(h)
                                        .setFont(bold).setFontSize(8)
                                        .setFontColor(WHITE)
                                        .setTextAlignment(isFirst ? TextAlignment.LEFT : TextAlignment.CENTER));
                        tbl.addHeaderCell(hc);
                }

                boolean alt = false;
                int idx = 0;
                for (PrescriptionMedicine med : p.getMedicines()) {
                        idx++;
                        DeviceRgb rowBg = alt ? TEAL_LIGHT : WHITE;

                        // ── Name + number badge + type ──
                        Cell nameCell = new Cell()
                                        .setBackgroundColor(rowBg)
                                        .setBorder(new SolidBorder(TEAL_MID, 0.4f))
                                        .setPadding(8);

                        // Row number badge
                        Table badge = new Table(UnitValue.createPercentArray(new float[] { 18, 82 }))
                                        .useAllAvailableWidth();
                        Cell numCell = new Cell().setBorder(Border.NO_BORDER);
                        numCell.add(new Paragraph(String.valueOf(idx))
                                        .setFont(bold).setFontSize(8)
                                        .setFontColor(WHITE)
                                        .setBackgroundColor(TEAL)
                                        .setTextAlignment(TextAlignment.CENTER)
                                        .setPaddingTop(1).setPaddingBottom(1).setPaddingLeft(4).setPaddingRight(4));
                        badge.addCell(numCell);
                        Cell nameTextCell = new Cell().setBorder(Border.NO_BORDER).setPaddingLeft(6);
                        nameTextCell.add(new Paragraph(med.getMedicineName())
                                        .setFont(bold).setFontSize(9).setFontColor(DARK).setMarginBottom(1));
                        if (med.getType() != null && !med.getType().isBlank()) {
                                nameTextCell.add(new Paragraph("(" + med.getType() + ")")
                                                .setFont(regular).setFontSize(7.5f).setFontColor(TEAL));
                        }
                        badge.addCell(nameTextCell);
                        nameCell.add(badge);
                        tbl.addCell(nameCell);

                        // ── Other cells ──
                        tbl.addCell(medCell(nvl(med.getDosage()), regular, rowBg, TextAlignment.CENTER));
                        tbl.addCell(medCell(nvl(med.getFrequency()), regular, rowBg, TextAlignment.CENTER));
                        tbl.addCell(medCell(nvl(med.getDuration()), regular, rowBg, TextAlignment.CENTER));
                        tbl.addCell(medCell(nvl(med.getInstructions()), regular, rowBg, TextAlignment.LEFT));

                        alt = !alt;
                }

                // Bottom accent line
                tbl.setBorderBottom(new SolidBorder(TEAL, 1.5f));
                doc.add(tbl);
        }

        /**
         * Two-column: additional notes (left) + follow-up date (right).
         */
        private void buildNotesAndFollowUp(Document doc, Prescription p,
                        PdfFont bold, PdfFont regular, PdfFont oblique) {

                DateTimeFormatter dtf = DateTimeFormatter.ofPattern("dd MMMM yyyy");

                Table row = new Table(UnitValue.createPercentArray(new float[] { 58, 42 }))
                                .useAllAvailableWidth().setMarginBottom(14);

                // ── Notes cell ──
                Cell notesCell = new Cell()
                                .setBackgroundColor(SLATE_50)
                                .setBorder(new SolidBorder(SLATE_200, 0.6f))
                                .setPadding(12);
                notesCell.add(new Paragraph("ADDITIONAL NOTES")
                                .setFont(bold).setFontSize(8).setFontColor(TEAL).setMarginBottom(5));
                String notes = (p.getAdditionalNotes() != null && !p.getAdditionalNotes().isBlank())
                                ? p.getAdditionalNotes()
                                : "No additional notes provided for this prescription.";
                notesCell.add(new Paragraph(notes)
                                .setFont(regular).setFontSize(9).setFontColor(SLATE_700));
                row.addCell(notesCell);

                // ── Follow-up cell ──
                Cell fuCell = new Cell()
                                .setBackgroundColor(PURPLE_BG)
                                .setBorder(new SolidBorder(PURPLE_MID, 0.6f))
                                .setPadding(12);
                fuCell.add(new Paragraph("FOLLOW-UP APPOINTMENT")
                                .setFont(bold).setFontSize(8).setFontColor(PURPLE).setMarginBottom(6));
                if (p.getFollowUpDate() != null) {
                        fuCell.add(new Paragraph(p.getFollowUpDate().format(dtf))
                                        .setFont(bold).setFontSize(14).setFontColor(PURPLE));
                        fuCell.add(new Paragraph(" ").setHeight(6));
                        fuCell.add(new Paragraph(
                                        "Please bring all previous reports and medication records on your next visit.")
                                        .setFont(oblique).setFontSize(7.5f).setFontColor(SLATE_500));
                } else {
                        fuCell.add(new Paragraph("As Required")
                                        .setFont(bold).setFontSize(14).setFontColor(PURPLE));
                        fuCell.add(new Paragraph(" ").setHeight(6));
                        fuCell.add(new Paragraph("Revisit if symptoms persist or worsen.")
                                        .setFont(oblique).setFontSize(7.5f).setFontColor(SLATE_500));
                }
                row.addCell(fuCell);
                doc.add(row);
        }

        /**
         * Signature row: patient on left, doctor on right.
         */
        private void buildSignatures(Document doc, Prescription p,
                        PdfFont bold, PdfFont regular) {

                String docName = "Dr. " + p.getDoctor().getUser().getName();
                String spec = nvl(p.getDoctor().getSpecialization());

                Table sigTable = new Table(UnitValue.createPercentArray(new float[] { 44, 12, 44 }))
                                .useAllAvailableWidth();

                sigTable.addCell(sigBlock(bold, regular,
                                "Patient / Guardian Acknowledgement",
                                p.getPatient().getUser().getName(),
                                SLATE_500));
                sigTable.addCell(new Cell().setBorder(Border.NO_BORDER));
                sigTable.addCell(sigBlock(bold, regular,
                                "Prescribing Doctor's Signature & Stamp",
                                docName + "  •  " + spec,
                                TEAL));

                doc.add(sigTable);
        }

        // ─── Page decoration ──────────────────────────────────────────────────────

        /**
         * Draws: outer teal border, inner hairline border, and bottom footer bar.
         * Fires on every page via event handler.
         */
        private void addPageDecoration(PdfDocument pdfDoc, PdfFont regular) {
                pdfDoc.addEventHandler(PdfDocumentEvent.END_PAGE, event -> {
                        com.itextpdf.kernel.events.PdfDocumentEvent docEvent = (com.itextpdf.kernel.events.PdfDocumentEvent) event;
                        PdfPage page = docEvent.getPage();
                        PdfCanvas canvas = new PdfCanvas(page);
                        try {
                                PageSize ps = pdfDoc.getDefaultPageSize();
                                float w = ps.getWidth(), h = ps.getHeight();
                                float m = 10f; // outer margin from edge
                                float t = 2f; // border thickness

                                // ── Outer teal border ──
                                canvas.setStrokeColor(TEAL).setLineWidth(t)
                                                .rectangle(m, m, w - 2 * m, h - 2 * m)
                                                .stroke();

                                // ── Inner fine border ──
                                canvas.setStrokeColor(TEAL_MID).setLineWidth(0.35f)
                                                .rectangle(m + 3.5f, m + 3.5f, w - 2 * (m + 3.5f), h - 2 * (m + 3.5f))
                                                .stroke();

                                // ── Corner accent squares (top-left, top-right) ──
                                float sq = 6f;
                                canvas.setFillColor(TEAL)
                                                .rectangle(m, h - m - sq, sq, sq).fill()
                                                .rectangle(w - m - sq, h - m - sq, sq, sq).fill();

                                // ── Footer teal bar ──
                                float fh = 11f; // footer bar height
                                canvas.setFillColor(TEAL)
                                                .rectangle(m, m, w - 2 * m, fh).fill();

                                // Footer text
                                canvas.setFillColor(ColorConstants.WHITE)
                                                .setFontAndSize(regular, 6.5f)
                                                .beginText()
                                                .moveText(m + 12, m + 4f)
                                                .showText("MediCare Smart Healthcare System  •  Digitally Generated Prescription  •  This document is valid without a physical stamp")
                                                .endText();

                        } catch (Exception ex) {
                                log.warn("Page decoration error: {}", ex.getMessage());
                        } finally {
                                canvas.release();
                        }
                });
        }

        // ─── Logo box ─────────────────────────────────────────────────────────────

        /**
         * Builds a teal square logo block with the stethoscope cross symbol.
         */
        private Table buildLogoBox(PdfFont bold) {
                Table t = new Table(UnitValue.createPointArray(new float[] { 56 }));
                Cell c = new Cell()
                                .setHeight(56)
                                .setBackgroundColor(TEAL)
                                .setBorder(Border.NO_BORDER)
                                .setVerticalAlignment(VerticalAlignment.MIDDLE)
                                .setTextAlignment(TextAlignment.CENTER)
                                .setPadding(2);

                // Stethoscope cross glyph (standard fonts supported)
                c.add(new Paragraph("+")
                                .setFont(bold).setFontSize(28)
                                .setFontColor(WHITE)
                                .setMarginBottom(-6).setMarginTop(4));
                c.add(new Paragraph("M")
                                .setFont(bold).setFontSize(11)
                                .setFontColor(TEAL_MID)
                                .setMarginTop(0));
                t.addCell(c);
                t.setWidth(56);
                return t;
        }

        // ─── Helpers ──────────────────────────────────────────────────────────────

        /**
         * Info block cell (doctor or patient card).
         */
        private Cell buildInfoBlock(PdfFont bold, PdfFont regular,
                        String heading, DeviceRgb headColor,
                        DeviceRgb bgColor, DeviceRgb borderColor,
                        String[][] rows) {
                Cell cell = new Cell()
                                .setBackgroundColor(bgColor)
                                .setBorder(new SolidBorder(borderColor, 0.6f))
                                .setPadding(12);

                // Heading with left accent bar effect via pipe character
                cell.add(new Paragraph(heading)
                                .setFont(bold).setFontSize(8)
                                .setFontColor(headColor).setMarginBottom(8));

                for (String[] row : rows) {
                        Table rt = new Table(UnitValue.createPercentArray(new float[] { 34, 66 }))
                                        .useAllAvailableWidth().setMarginBottom(0);
                        rt.addCell(new Cell().setBorder(Border.NO_BORDER).setPaddingTop(2).setPaddingBottom(2)
                                        .add(new Paragraph(row[0])
                                                        .setFont(bold).setFontSize(7.5f).setFontColor(SLATE_500)));
                        rt.addCell(new Cell().setBorder(Border.NO_BORDER).setPaddingTop(2).setPaddingBottom(2)
                                        .add(new Paragraph(row[1])
                                                        .setFont(regular).setFontSize(8.5f).setFontColor(DARK)));
                        cell.add(rt);
                }
                return cell;
        }

        /**
         * Standard medicine table body cell.
         */
        private Cell medCell(String text, PdfFont font, DeviceRgb bg, TextAlignment align) {
                return new Cell()
                                .setBackgroundColor(bg)
                                .setBorder(new SolidBorder(TEAL_MID, 0.3f))
                                .setPadding(8)
                                .add(new Paragraph(text)
                                                .setFont(font).setFontSize(8.5f)
                                                .setFontColor(DARK).setTextAlignment(align));
        }

        /**
         * Signature block cell with space for a handwritten signature.
         */
        private Cell sigBlock(PdfFont bold, PdfFont regular,
                        String label, String name, DeviceRgb lineColor) {
                Cell cell = new Cell().setBorder(Border.NO_BORDER).setPadding(4);
                cell.add(new Paragraph(label)
                                .setFont(regular).setFontSize(7.5f)
                                .setFontColor(SLATE_400).setMarginBottom(24));
                cell.add(new LineSeparator(new SolidLine(0.7f)).setStrokeColor(lineColor));
                cell.add(new Paragraph(name)
                                .setFont(bold).setFontSize(8f)
                                .setFontColor(lineColor)
                                .setTextAlignment(TextAlignment.CENTER).setMarginTop(3));
                return cell;
        }

        /**
         * Null-safe value: returns "-" for blank/null strings.
         */
        private String nvl(String v) {
                return (v != null && !v.isBlank()) ? v : "-";
        }

        // ─── Response mapper ──────────────────────────────────────────────────────

        private PrescriptionResponse mapToResponse(Prescription p) {
                List<PrescriptionResponse.MedicineResponse> meds = p.getMedicines() == null
                                ? List.of()
                                : p.getMedicines().stream().map(m -> PrescriptionResponse.MedicineResponse.builder()
                                                .id(m.getId())
                                                .medicineName(m.getMedicineName())
                                                .dosage(m.getDosage())
                                                .frequency(m.getFrequency())
                                                .duration(m.getDuration())
                                                .instructions(m.getInstructions())
                                                .type(m.getType())
                                                .build()).toList();

                return PrescriptionResponse.builder()
                                .id(p.getId())
                                .appointmentId(p.getAppointment().getId())
                                .doctorName(p.getDoctor().getUser().getName())
                                .doctorSpecialization(p.getDoctor().getSpecialization())
                                .doctorQualification(p.getDoctor().getQualification())
                                .hospitalName(p.getDoctor().getHospital())
                                .patientName(p.getPatient().getUser().getName())
                                .patientEmail(p.getPatient().getUser().getEmail())
                                .diagnosis(p.getDiagnosis())
                                .medicines(meds)
                                .additionalNotes(p.getAdditionalNotes())
                                .followUpDate(p.getFollowUpDate())
                                .createdAt(p.getCreatedAt())
                                .build();
        }
}