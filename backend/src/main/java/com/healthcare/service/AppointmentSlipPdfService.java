package com.healthcare.service;

import com.healthcare.entity.Appointment;
import com.itextpdf.io.font.constants.StandardFonts;
import com.itextpdf.io.image.ImageDataFactory;
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.events.PdfDocumentEvent;
import com.itextpdf.kernel.font.PdfFont;
import com.itextpdf.kernel.font.PdfFontFactory;
import com.itextpdf.kernel.geom.PageSize;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfPage;
import com.itextpdf.kernel.pdf.PdfWriter;
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

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/**
 * Generates a clean, professional OPD Appointment Slip PDF.
 *
 * Fixes applied:
 * - Payment pill: compact, tight padding, proper vertical alignment
 * - OPD badge: single-line minimal tag instead of 3-line bloated box
 * - Meta labels: Title Case instead of ALL CAPS
 * - "Not specified": italic muted instead of bold black
 * - Lighter borders (0.5f), softer status pill colors
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AppointmentSlipPdfService {

    // ── Branding ──────────────────────────────────────────────────────────────
    private static final String HOSPITAL_NAME = "MediCare";
    private static final String HOSPITAL_TAGLINE = "Smarter Care, Better Health";
    private static final String SUPPORT_PHONE = "1800-000-0000";
    private static final String WEBSITE = "www.medicare.health";

    // ── Colour Palette ────────────────────────────────────────────────────────
    private static final DeviceRgb C_TEAL       = new DeviceRgb(15, 85, 90);
    private static final DeviceRgb C_TEAL_DIM   = new DeviceRgb(60, 130, 126);
    private static final DeviceRgb C_INK        = new DeviceRgb(14, 17, 22);
    private static final DeviceRgb C_SLATE      = new DeviceRgb(94, 106, 120);
    private static final DeviceRgb C_MUTED      = new DeviceRgb(148, 163, 184);
    private static final DeviceRgb C_GHOST      = new DeviceRgb(246, 248, 250);
    private static final DeviceRgb C_SURFACE    = new DeviceRgb(250, 252, 253);
    private static final DeviceRgb C_BORDER     = new DeviceRgb(218, 224, 230);
    private static final DeviceRgb C_WHITE      = new DeviceRgb(255, 255, 255);

    // Status pills — softer, more restrained
    private static final DeviceRgb C_GREEN_BG   = new DeviceRgb(220, 252, 231);
    private static final DeviceRgb C_GREEN_FG   = new DeviceRgb(22, 101, 52);
    private static final DeviceRgb C_GREEN_BR   = new DeviceRgb(134, 239, 172);
    private static final DeviceRgb C_AMBER_BG   = new DeviceRgb(254, 249, 235);
    private static final DeviceRgb C_AMBER_FG   = new DeviceRgb(146, 64, 14);
    private static final DeviceRgb C_AMBER_BR   = new DeviceRgb(252, 211, 77);
    private static final DeviceRgb C_RED_BG     = new DeviceRgb(254, 226, 226);
    private static final DeviceRgb C_RED_FG     = new DeviceRgb(153, 27, 27);
    private static final DeviceRgb C_RED_BR     = new DeviceRgb(252, 165, 165);
    private static final DeviceRgb C_BLUE_BG    = new DeviceRgb(239, 246, 255);
    private static final DeviceRgb C_BLUE_FG    = new DeviceRgb(30, 64, 175);
    private static final DeviceRgb C_BLUE_BR    = new DeviceRgb(191, 219, 254);

    // ── Page geometry ──────────────────────────────────────────────────────────
    private static final float MARGIN_X = 48f;
    private static final float MARGIN_Y = 48f;

    // ── Fonts ──────────────────────────────────────────────────────────────────
    private PdfFont FB;
    private PdfFont FR;
    private PdfFont FI;

    // ═══════════════════════════════════════════════════════════════════════════
    // PUBLIC ENTRY POINT
    // ═══════════════════════════════════════════════════════════════════════════

    public byte[] generateSlip(Appointment appointment, String title, String subtitle) {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {

            PdfWriter writer = new PdfWriter(baos);
            PdfDocument pdfDoc = new PdfDocument(writer);
            Document document = new Document(pdfDoc, PageSize.A4);
            document.setMargins(MARGIN_Y, MARGIN_X, MARGIN_Y + 24f, MARGIN_X);

            FB = PdfFontFactory.createFont(StandardFonts.HELVETICA_BOLD);
            FR = PdfFontFactory.createFont(StandardFonts.HELVETICA);
            FI = PdfFontFactory.createFont(StandardFonts.HELVETICA_OBLIQUE);

            addPageDecoration(pdfDoc);

            // 1. Header
            document.add(buildHeader(appointment));

            // 2. Accent rule
            document.add(new LineSeparator(new SolidLine(1.0f))
                    .setStrokeColor(C_TEAL).setMarginBottom(16));

            // 3. Meta strip
            document.add(buildMetaStrip(appointment));

            // 4. Info cards
            document.add(buildInfoCards(appointment));

            // 5. Schedule card
            document.add(buildScheduleCard(appointment));

            // 6. Reason block
            document.add(buildReasonBlock(appointment));

            // 7. Notice box
            document.add(buildNoticeBox());

            // 8. Signatures
            document.add(buildSignatureArea(appointment));

            document.close();
            return baos.toByteArray();

        } catch (Exception e) {
            log.error("Appointment slip PDF generation failed", e);
            throw new IllegalStateException("Unable to generate appointment slip PDF", e);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // SECTION 1 – HEADER (clean, minimal)
    // ═══════════════════════════════════════════════════════════════════════════

    private Table buildHeader(Appointment appt) {
        Table t = new Table(UnitValue.createPercentArray(new float[] { 12, 68, 20 }))
                .useAllAvailableWidth()
                .setMarginBottom(4);

        // Logo
        Cell logoCell = new Cell().setBorder(Border.NO_BORDER)
                .setVerticalAlignment(VerticalAlignment.MIDDLE);
        logoCell.add(loadLogoImage(48, 48));
        t.addCell(logoCell);

        // Hospital info
        Cell centreCell = new Cell().setBorder(Border.NO_BORDER)
                .setVerticalAlignment(VerticalAlignment.MIDDLE);

        centreCell.add(new Paragraph(HOSPITAL_NAME)
                .setFont(FB).setFontSize(22f).setFontColor(C_TEAL)
                .setMargin(0).setMarginBottom(2));

        centreCell.add(new Paragraph(HOSPITAL_TAGLINE)
                .setFont(FI).setFontSize(8.5f).setFontColor(C_SLATE)
                .setMargin(0).setMarginBottom(5));

        centreCell.add(new Paragraph(SUPPORT_PHONE + "  ·  " + WEBSITE)
                .setFont(FR).setFontSize(7.5f).setFontColor(C_MUTED)
                .setMargin(0));

        t.addCell(centreCell);

        // OPD SLIP — minimal single-line tag
        Cell rightCell = new Cell().setBorder(Border.NO_BORDER)
                .setVerticalAlignment(VerticalAlignment.MIDDLE)
                .setTextAlignment(TextAlignment.RIGHT);

        Div badge = new Div()
                .setBackgroundColor(C_GHOST)
                .setBorder(new SolidBorder(C_BORDER, 0.6f))
                .setBorderRadius(new BorderRadius(4))
                .setPaddingLeft(12).setPaddingRight(12)
                .setPaddingTop(6).setPaddingBottom(6)
                .setTextAlignment(TextAlignment.CENTER);
        badge.add(new Paragraph("OPD SLIP")
                .setFont(FB).setFontSize(8f).setFontColor(C_TEAL)
                .setTextAlignment(TextAlignment.CENTER).setMargin(0));

        rightCell.add(badge);
        t.addCell(rightCell);
        return t;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // SECTION 2 – META STRIP (ghost bg, Title Case labels, compact payment pill)
    // ═══════════════════════════════════════════════════════════════════════════

    private Table buildMetaStrip(Appointment appt) {
        String apptId = String.format("APT-%08d", appt.getId());
        String uhid = String.format("UHID-%06d", appt.getPatient().getId());
        String generated = LocalDateTime.now()
                .format(DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a"));

        Table t = new Table(UnitValue.createPercentArray(new float[] { 30, 28, 28, 14 }))
                .useAllAvailableWidth()
                .setMarginBottom(20)
                .setBackgroundColor(C_GHOST);

        // Title Case labels instead of ALL CAPS
        t.addCell(metaCell("Appointment ID", apptId, TextAlignment.LEFT));
        t.addCell(metaCell("Patient UHID", uhid, TextAlignment.LEFT));
        t.addCell(metaCell("Generated On", generated, TextAlignment.LEFT));

        // Payment pill — compact, vertically centered
        Cell pillCell = new Cell().setBorder(Border.NO_BORDER)
                .setVerticalAlignment(VerticalAlignment.MIDDLE)
                .setTextAlignment(TextAlignment.RIGHT)
                .setPaddingRight(12);
        pillCell.add(buildPaymentPill(appt));
        t.addCell(pillCell);

        return t;
    }

    private Cell metaCell(String label, String value, TextAlignment align) {
        Cell c = new Cell().setBorder(Border.NO_BORDER)
                .setPaddingTop(10).setPaddingBottom(10)
                .setPaddingLeft(12).setPaddingRight(12);
        c.add(new Paragraph(label)
                .setFont(FR).setFontSize(6.5f).setFontColor(C_MUTED)
                .setCharacterSpacing(0.6f).setTextAlignment(align).setMarginBottom(3));
        c.add(new Paragraph(value)
                .setFont(FB).setFontSize(9.5f).setFontColor(C_INK)
                .setTextAlignment(align));
        return c;
    }

    /** Compact payment pill — tight padding, clean typography */
    private Div buildPaymentPill(Appointment appt) {
        String rawStatus = appt.getPaymentStatus() != null ? appt.getPaymentStatus().name() : "PENDING";
        String label = rawStatus.replace("_", " ");
        String fee = "Rs. " + String.format("%.0f", appt.getDoctor().getConsultationFee());

        DeviceRgb bg, fg, border;
        switch (rawStatus.toUpperCase()) {
            case "PAID" -> {
                bg = C_GREEN_BG; fg = C_GREEN_FG; border = C_GREEN_BR;
            }
            case "FAILED", "CANCELLED" -> {
                bg = C_RED_BG; fg = C_RED_FG; border = C_RED_BR;
            }
            default -> {
                bg = C_AMBER_BG; fg = C_AMBER_FG; border = C_AMBER_BR;
            }
        }

        Div pill = new Div()
                .setBackgroundColor(bg)
                .setBorder(new SolidBorder(border, 0.8f))
                .setBorderRadius(new BorderRadius(14))
                .setPaddingLeft(10).setPaddingRight(10)
                .setPaddingTop(4).setPaddingBottom(4)
                .setHorizontalAlignment(HorizontalAlignment.RIGHT)
                .setTextAlignment(TextAlignment.CENTER);

        pill.add(new Paragraph(label)
                .setFont(FB).setFontSize(7f).setFontColor(fg)
                .setTextAlignment(TextAlignment.CENTER).setMargin(0).setMarginBottom(1));
        pill.add(new Paragraph(fee)
                .setFont(FB).setFontSize(9f).setFontColor(fg)
                .setTextAlignment(TextAlignment.CENTER).setMargin(0));

        return pill;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // SECTION 3 – INFO CARDS (lighter borders, left-border accent)
    // ═══════════════════════════════════════════════════════════════════════════

    private Table buildInfoCards(Appointment appt) {
        Table t = new Table(UnitValue.createPercentArray(new float[] { 49, 2, 49 }))
                .useAllAvailableWidth().setMarginBottom(16);
        t.addCell(buildPatientCard(appt));
        t.addCell(new Cell().setBorder(Border.NO_BORDER));
        t.addCell(buildDoctorCard(appt));
        return t;
    }

    private Cell buildPatientCard(Appointment appt) {
        Cell cell = new Cell()
                .setBorder(new SolidBorder(C_BORDER, 0.5f))
                .setBackgroundColor(C_WHITE)
                .setBorderLeft(new SolidBorder(C_TEAL, 3f))
                .setPaddingLeft(14).setPaddingRight(14)
                .setPaddingTop(12).setPaddingBottom(12);

        cell.add(new Paragraph("PATIENT INFORMATION")
                .setFont(FB).setFontSize(6.5f).setFontColor(C_TEAL)
                .setCharacterSpacing(0.8f).setMargin(0).setMarginBottom(10));

        addInfoRow(cell, "Full Name", safe(appt.getPatient().getUser().getName()), true);
        addInfoRow(cell, "Phone", safe(appt.getPatient().getUser().getPhone()), false);
        addInfoRow(cell, "Email", safe(appt.getPatient().getUser().getEmail()), false);
        addInfoRow(cell, "Blood Group", safe(appt.getPatient().getBloodGroup()), false);
        addInfoRow(cell, "Visit Type",
                Boolean.TRUE.equals(appt.getIsFirstVisit()) ? "First Visit" : "Follow-Up", false);

        return cell;
    }

    private Cell buildDoctorCard(Appointment appt) {
        Cell cell = new Cell()
                .setBorder(new SolidBorder(C_BORDER, 0.5f))
                .setBackgroundColor(C_WHITE)
                .setBorderLeft(new SolidBorder(C_SLATE, 3f))
                .setPaddingLeft(14).setPaddingRight(14)
                .setPaddingTop(12).setPaddingBottom(12);

        cell.add(new Paragraph("CONSULTING DOCTOR")
                .setFont(FB).setFontSize(6.5f).setFontColor(C_SLATE)
                .setCharacterSpacing(0.8f).setMargin(0).setMarginBottom(10));

        addInfoRow(cell, "Name", "Dr. " + safe(appt.getDoctor().getUser().getName()), true);
        addInfoRow(cell, "Specialization", safe(appt.getDoctor().getSpecialization()), false);
        addInfoRow(cell, "Qualification", safe(appt.getDoctor().getQualification()), false);
        addInfoRow(cell, "Hospital", safe(appt.getDoctor().getHospital()), false);
        addInfoRow(cell, "Consult Fee",
                "Rs. " + String.format("%.0f", appt.getDoctor().getConsultationFee()), false);

        return cell;
    }

    private void addInfoRow(Cell parent, String label, String value, boolean boldValue) {
        Table row = new Table(UnitValue.createPercentArray(new float[] { 36, 64 }))
                .useAllAvailableWidth().setMarginBottom(4);
        row.addCell(new Cell().setBorder(Border.NO_BORDER).setPadding(0)
                .add(new Paragraph(label)
                        .setFont(FR).setFontSize(7.5f).setFontColor(C_MUTED).setMargin(0)));
        row.addCell(new Cell().setBorder(Border.NO_BORDER).setPadding(0)
                .add(new Paragraph(value)
                        .setFont(boldValue ? FB : FR).setFontSize(8.5f).setFontColor(C_INK)
                        .setMargin(0)));
        parent.add(row);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // SECTION 4 – SCHEDULE CARD (compact, softer status pill)
    // ═══════════════════════════════════════════════════════════════════════════

    private Table buildScheduleCard(Appointment appt) {
        DateTimeFormatter dateFmt = DateTimeFormatter.ofPattern("EEEE, dd MMMM yyyy");
        DateTimeFormatter timeFmt = DateTimeFormatter.ofPattern("hh:mm a");

        String date = appt.getAppointmentDate().format(dateFmt);
        String start = appt.getStartTime().format(timeFmt).toUpperCase();
        String end = appt.getEndTime().format(timeFmt).toUpperCase();

        String statusLabel = appt.getStatus() != null ? appt.getStatus().name() : "SCHEDULED";
        DeviceRgb[] sc = resolveStatusColors(statusLabel);

        String duration = appt.getDoctor().getSlotDuration() != null
                ? appt.getDoctor().getSlotDuration() + " min"
                : "30 min";

        Table wrapper = new Table(UnitValue.createPercentArray(new float[] { 100 }))
                .useAllAvailableWidth().setMarginBottom(16);

        Cell outer = new Cell()
                .setBorder(new SolidBorder(C_BORDER, 0.5f))
                .setBackgroundColor(C_WHITE)
                .setPadding(12);

        outer.add(new Paragraph("APPOINTMENT SCHEDULE")
                .setFont(FB).setFontSize(6.5f).setFontColor(C_INK)
                .setCharacterSpacing(0.8f).setMargin(0).setMarginBottom(10));

        Table t = new Table(UnitValue.createPercentArray(new float[] { 34, 30, 18, 18 }))
                .useAllAvailableWidth();

        Cell dateCol = new Cell().setBorder(Border.NO_BORDER).setPaddingRight(14);
        dateCol.add(new Paragraph("DATE").setFont(FR).setFontSize(6.5f).setFontColor(C_MUTED)
                .setMargin(0).setMarginBottom(2));
        dateCol.add(new Paragraph(date).setFont(FB).setFontSize(9.5f).setFontColor(C_INK)
                .setMargin(0).setFixedLeading(12f));
        t.addCell(dateCol);

        t.addCell(scheduleCell("TIME SLOT", start + " – " + end, C_INK));
        t.addCell(scheduleCell("DURATION", duration, C_INK));

        // Softer status pill
        Cell statusCol = new Cell().setBorder(Border.NO_BORDER)
                .setVerticalAlignment(VerticalAlignment.MIDDLE)
                .setTextAlignment(TextAlignment.RIGHT);
        Div pill = new Div()
                .setBackgroundColor(sc[0])
                .setBorder(new SolidBorder(sc[2], 0.8f))
                .setBorderRadius(new BorderRadius(10))
                .setPaddingLeft(10).setPaddingRight(10)
                .setPaddingTop(3).setPaddingBottom(3)
                .setHorizontalAlignment(HorizontalAlignment.RIGHT);
        pill.add(new Paragraph(statusLabel.replace("_", " "))
                .setFont(FB).setFontSize(7.5f).setFontColor(sc[1])
                .setTextAlignment(TextAlignment.CENTER).setMargin(0));
        statusCol.add(pill);
        t.addCell(statusCol);

        outer.add(t);
        wrapper.addCell(outer);
        return wrapper;
    }

    private Cell scheduleCell(String label, String value, DeviceRgb valColor) {
        Cell c = new Cell().setBorder(Border.NO_BORDER).setPaddingRight(12);
        c.add(new Paragraph(label).setFont(FR).setFontSize(6.5f).setFontColor(C_MUTED)
                .setMargin(0).setMarginBottom(2));
        c.add(new Paragraph(value).setFont(FB).setFontSize(9.5f).setFontColor(valColor)
                .setMargin(0).setFixedLeading(12f));
        return c;
    }

    private DeviceRgb[] resolveStatusColors(String status) {
        return switch (status) {
            case "COMPLETED" -> new DeviceRgb[] { C_GREEN_BG, C_GREEN_FG, C_GREEN_BR };
            case "CANCELLED" -> new DeviceRgb[] { C_RED_BG, C_RED_FG, C_RED_BR };
            case "NO_SHOW" -> new DeviceRgb[] { C_AMBER_BG, C_AMBER_FG, C_AMBER_BR };
            case "RESCHEDULED" -> new DeviceRgb[] { C_BLUE_BG, C_BLUE_FG, C_BLUE_BR };
            default -> new DeviceRgb[] { C_GHOST, C_TEAL, C_BORDER };
        };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // SECTION 5 – REASON BLOCK (italic muted for "Not specified")
    // ═══════════════════════════════════════════════════════════════════════════

    private Table buildReasonBlock(Appointment appt) {
        Table t = new Table(UnitValue.createPercentArray(new float[] { 100 }))
                .useAllAvailableWidth().setMarginBottom(16);

        Cell c = new Cell()
                .setBackgroundColor(C_GHOST)
                .setBorder(Border.NO_BORDER)
                .setBorderLeft(new SolidBorder(C_TEAL, 3f))
                .setPaddingLeft(16).setPaddingRight(16)
                .setPaddingTop(12).setPaddingBottom(12);

        c.add(new Paragraph("REASON FOR VISIT")
                .setFont(FB).setFontSize(6.5f).setFontColor(C_TEAL)
                .setCharacterSpacing(0.8f).setMargin(0).setMarginBottom(6));

        String reason = (appt.getReason() != null && !appt.getReason().isBlank())
                ? appt.getReason()
                : "Not specified";

        // If not specified, use italic muted instead of bold black
        boolean hasReason = appt.getReason() != null && !appt.getReason().isBlank();
        c.add(new Paragraph(reason)
                .setFont(hasReason ? FB : FI)
                .setFontSize(hasReason ? 11f : 10f)
                .setFontColor(hasReason ? C_INK : C_MUTED)
                .setFixedLeading(15f).setMargin(0));

        if (appt.getDoctorNotes() != null && !appt.getDoctorNotes().isBlank()) {
            c.add(new Paragraph("DOCTOR'S NOTES")
                    .setFont(FB).setFontSize(6.5f).setFontColor(C_MUTED)
                    .setCharacterSpacing(0.8f).setMargin(0).setMarginTop(10).setMarginBottom(4));
            c.add(new Paragraph(appt.getDoctorNotes())
                    .setFont(FI).setFontSize(8.5f).setFontColor(C_SLATE)
                    .setFixedLeading(12f).setMargin(0));
        }

        t.addCell(c);
        return t;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // SECTION 6 – NOTICE BOX
    // ═══════════════════════════════════════════════════════════════════════════

    private Table buildNoticeBox() {
        Table t = new Table(UnitValue.createPercentArray(new float[] { 100 }))
                .useAllAvailableWidth().setMarginBottom(20);

        Cell c = new Cell()
                .setBorder(new SolidBorder(C_BORDER, 0.5f))
                .setBackgroundColor(C_SURFACE)
                .setPadding(12).setPaddingLeft(14);

        c.add(new Paragraph("Important Instructions")
                .setFont(FB).setFontSize(6.5f).setFontColor(C_SLATE)
                .setCharacterSpacing(0.8f).setMargin(0).setMarginBottom(8));

        String[] notices = {
                "Please arrive 15 minutes before your scheduled appointment time.",
                "Carry all previous medical records, test reports and prescriptions.",
                "Cancellations must be made at least 2 hours prior to the appointment.",
                "This is a computer-generated document. No signature required."
        };

        for (String n : notices) {
            c.add(new Paragraph("–  " + n)
                    .setFont(FR).setFontSize(7.5f).setFontColor(C_SLATE)
                    .setMargin(0).setMarginBottom(3).setMarginLeft(4));
        }

        t.addCell(c);
        return t;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // SECTION 7 – SIGNATURE AREA (dotted lines, refined)
    // ═══════════════════════════════════════════════════════════════════════════

    private Table buildSignatureArea(Appointment appt) {
        Table t = new Table(UnitValue.createPercentArray(new float[] { 44, 12, 44 }))
                .useAllAvailableWidth().setMarginTop(4);

        t.addCell(sigCell("Patient / Guardian", safe(appt.getPatient().getUser().getName()), C_INK, C_BORDER));
        t.addCell(new Cell().setBorder(Border.NO_BORDER));
        t.addCell(sigCell("Doctor's Signature & Stamp",
                "Dr. " + safe(appt.getDoctor().getUser().getName()) + "  ·  " + safe(appt.getDoctor().getSpecialization()),
                C_TEAL, C_TEAL));

        return t;
    }

    private Cell sigCell(String label, String name, DeviceRgb nameColor, DeviceRgb lineColor) {
        Cell c = new Cell().setBorder(Border.NO_BORDER);
        c.add(new LineSeparator(new SolidLine(0.5f)).setStrokeColor(lineColor).setMarginBottom(20));
        c.add(new Paragraph(label)
                .setFont(FR).setFontSize(7.5f).setFontColor(C_MUTED).setMarginBottom(2));
        c.add(new Paragraph(name)
                .setFont(FB).setFontSize(8.5f).setFontColor(nameColor)
                .setTextAlignment(TextAlignment.CENTER));
        return c;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PAGE DECORATION
    // ═══════════════════════════════════════════════════════════════════════════

    private void addPageDecoration(PdfDocument pdfDoc) {
        pdfDoc.addEventHandler(PdfDocumentEvent.END_PAGE, event -> {
            PdfDocumentEvent docEvent = (PdfDocumentEvent) event;
            PdfPage page = docEvent.getPage();
            PdfCanvas canvas = new PdfCanvas(page);
            try {
                float w = PageSize.A4.getWidth();
                float h = PageSize.A4.getHeight();
                float bh = 3f;

                canvas.setFillColor(C_TEAL)
                        .rectangle(0, h - bh, w, bh).fill();

                canvas.setStrokeColor(C_BORDER).setLineWidth(0.5f)
                        .rectangle(18, 18, w - 36, h - 36 - bh).stroke();

                float footerH = 20f;
                canvas.setFillColor(C_GHOST)
                        .rectangle(18, 18, w - 36, footerH).fill();

                PdfFont fr = PdfFontFactory.createFont(StandardFonts.HELVETICA);

                canvas.setFillColor(C_MUTED).setFontAndSize(fr, 6.5f)
                        .beginText()
                        .moveText(26, 24)
                        .showText(HOSPITAL_NAME + "  ·  " + WEBSITE + "  ·  Helpline: " + SUPPORT_PHONE)
                        .endText();

                canvas.setFillColor(C_MUTED).setFontAndSize(fr, 6.5f)
                        .beginText()
                        .moveText(w - 200, 24)
                        .showText("Computer-generated OPD slip")
                        .endText();

            } catch (Exception ex) {
                log.warn("Page decoration error: {}", ex.getMessage());
            } finally {
                canvas.release();
            }
        });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // LOGO LOADING
    // ═══════════════════════════════════════════════════════════════════════════

    private Image loadLogoImage(float w, float h) {
        byte[] logoBytes = null;

        try {
            ClassPathResource res = new ClassPathResource("static/MediCare_logo.png");
            try (InputStream is = res.getInputStream()) {
                logoBytes = is.readAllBytes();
            }
        } catch (Exception ignored) {
        }

        if (logoBytes == null) {
            for (String path : new String[] {
                    "MediCare_logo.png", "MediCare logo.png",
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

    // ═══════════════════════════════════════════════════════════════════════════
    // UTILITIES
    // ═══════════════════════════════════════════════════════════════════════════

    private String safe(String s) {
        return (s == null || s.isBlank()) ? "\u2014" : s;
    }
}