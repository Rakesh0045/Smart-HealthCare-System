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
 * Design principles:
 * - Minimal, whitespace-driven layout
 * - Restrained colour palette (teal accent + neutral greys)
 * - Payment status as an inline pill — not a heavy card
 * - Compact schedule row instead of a dark slab
 * - Consistent 6 px card border-radius, single border weight
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AppointmentSlipPdfService {

        // ── Branding ──────────────────────────────────────────────────────────────
        private static final String HOSPITAL_NAME = "MediCare Hospital";
        private static final String HOSPITAL_TAGLINE = "Smarter Care, Better Health";
        private static final String SUPPORT_PHONE = "1800-000-0000";
        private static final String WEBSITE = "www.medicare.health";

        // ── Colour Palette ────────────────────────────────────────────────────────
        private static final DeviceRgb C_TEAL = new DeviceRgb(13, 148, 136);
        private static final DeviceRgb C_TEAL_LIGHT = new DeviceRgb(240, 253, 250);
        private static final DeviceRgb C_TEAL_MID = new DeviceRgb(180, 235, 225);
        private static final DeviceRgb C_NAVY = new DeviceRgb(30, 58, 95);
        private static final DeviceRgb C_NAVY_MID = new DeviceRgb(51, 90, 150);
        private static final DeviceRgb C_DARK = new DeviceRgb(17, 24, 39);
        private static final DeviceRgb C_SLATE = new DeviceRgb(71, 85, 105);
        private static final DeviceRgb C_MUTED = new DeviceRgb(148, 163, 184);
        private static final DeviceRgb C_LIGHT_BG = new DeviceRgb(249, 250, 251);
        private static final DeviceRgb C_BORDER = new DeviceRgb(226, 232, 240);
        private static final DeviceRgb C_CARD_BG = new DeviceRgb(255, 255, 255);

        // Status colours
        private static final DeviceRgb C_GREEN_BG = new DeviceRgb(220, 252, 231);
        private static final DeviceRgb C_GREEN_FG = new DeviceRgb(22, 101, 52);
        private static final DeviceRgb C_GREEN_BORD = new DeviceRgb(134, 239, 172);
        private static final DeviceRgb C_AMBER_BG = new DeviceRgb(255, 251, 235);
        private static final DeviceRgb C_AMBER_FG = new DeviceRgb(120, 53, 15);
        private static final DeviceRgb C_AMBER_BORD = new DeviceRgb(252, 211, 77);
        private static final DeviceRgb C_RED_BG = new DeviceRgb(254, 226, 226);
        private static final DeviceRgb C_RED_FG = new DeviceRgb(153, 27, 27);
        private static final DeviceRgb C_RED_BORD = new DeviceRgb(252, 165, 165);
        private static final DeviceRgb C_BLUE_BG = new DeviceRgb(219, 234, 254);
        private static final DeviceRgb C_BLUE_FG = new DeviceRgb(30, 64, 175);

        // ── Page geometry ──────────────────────────────────────────────────────────
        private static final float MARGIN_X = 32f;
        private static final float MARGIN_Y = 32f;

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
                        document.setMargins(MARGIN_Y, MARGIN_X, MARGIN_Y + 22f, MARGIN_X);

                        FB = PdfFontFactory.createFont(StandardFonts.HELVETICA_BOLD);
                        FR = PdfFontFactory.createFont(StandardFonts.HELVETICA);
                        FI = PdfFontFactory.createFont(StandardFonts.HELVETICA_OBLIQUE);

                        addPageDecoration(pdfDoc);

                        // 1. Header: logo + name + tagline + website
                        document.add(buildHeader(appointment));

                        // 2. Thin full-width divider
                        document.add(new LineSeparator(new SolidLine(0.6f))
                                        .setStrokeColor(C_BORDER).setMarginBottom(10));

                        // 3. ID ribbon (professional metadata strip + payment pill)
                        document.add(buildApptRibbon(appointment));

                        // 4. Two-column info cards: Patient | Doctor
                        document.add(buildInfoCards(appointment));

                        // 5. Schedule row (compact, light background)
                        document.add(buildScheduleCard(appointment));

                        // 6. Reason + status
                        document.add(buildReasonStatusRow(appointment));

                        // 7. Notice box
                        document.add(buildNoticeBox());

                        // 8. Signature area
                        document.add(buildSignatureArea(appointment));

                        document.close();
                        return baos.toByteArray();

                } catch (Exception e) {
                        log.error("Appointment slip PDF generation failed", e);
                        throw new IllegalStateException("Unable to generate appointment slip PDF", e);
                }
        }

        // ═══════════════════════════════════════════════════════════════════════════
        // SECTION 1 – HEADER (no address, clean centred layout)
        // ═══════════════════════════════════════════════════════════════════════════

        private Table buildHeader(Appointment appt) {
                // 3 columns: logo | hospital info | doc title label
                Table t = new Table(UnitValue.createPercentArray(new float[] { 18, 64, 18 }))
                                .useAllAvailableWidth()
                                .setMarginBottom(8);

                // Left: logo
                Cell logoCell = new Cell().setBorder(Border.NO_BORDER)
                                .setVerticalAlignment(VerticalAlignment.MIDDLE);
                logoCell.add(loadLogoImage(70, 70));
                t.addCell(logoCell);

                // Centre: hospital name + tagline + contact line
                Cell centreCell = new Cell().setBorder(Border.NO_BORDER)
                                .setVerticalAlignment(VerticalAlignment.MIDDLE)
                                .setTextAlignment(TextAlignment.CENTER);

                centreCell.add(new Paragraph(HOSPITAL_NAME)
                                .setFont(FB).setFontSize(20f).setFontColor(C_TEAL)
                                .setTextAlignment(TextAlignment.CENTER).setMargin(0).setMarginBottom(3));

                centreCell.add(new Paragraph(HOSPITAL_TAGLINE)
                                .setFont(FI).setFontSize(8.5f).setFontColor(C_SLATE)
                                .setTextAlignment(TextAlignment.CENTER).setMargin(0).setMarginBottom(6));

                // Single compact contact line
                centreCell.add(new Paragraph("Helpline: " + SUPPORT_PHONE + "   |   " + WEBSITE)
                                .setFont(FR).setFontSize(7.5f).setFontColor(C_MUTED)
                                .setTextAlignment(TextAlignment.CENTER).setMargin(0));

                t.addCell(centreCell);

                // Right: "OPD SLIP" label
                Cell rightCell = new Cell().setBorder(Border.NO_BORDER)
                                .setVerticalAlignment(VerticalAlignment.MIDDLE)
                                .setTextAlignment(TextAlignment.RIGHT);

                Div label = new Div()
                                .setBackgroundColor(C_TEAL_LIGHT)
                                .setBorder(new SolidBorder(C_TEAL_MID, 1f))
                                .setBorderRadius(new BorderRadius(6))
                                .setPadding(8)
                                .setTextAlignment(TextAlignment.CENTER);
                label.add(new Paragraph("OPD").setFont(FB).setFontSize(10f).setFontColor(C_TEAL)
                                .setTextAlignment(TextAlignment.CENTER).setMargin(0).setMarginBottom(1));
                label.add(new Paragraph("APPOINTMENT").setFont(FR).setFontSize(6.5f).setFontColor(C_TEAL)
                                .setTextAlignment(TextAlignment.CENTER).setMargin(0).setMarginBottom(1));
                label.add(new Paragraph("SLIP").setFont(FB).setFontSize(10f).setFontColor(C_TEAL)
                                .setTextAlignment(TextAlignment.CENTER).setMargin(0));
                rightCell.add(label);

                t.addCell(rightCell);
                return t;
        }

        // ═══════════════════════════════════════════════════════════════════════════
        // SECTION 2 – RIBBON (ID + UHID + date + inline payment pill)
        // ═══════════════════════════════════════════════════════════════════════════

        private Div buildApptRibbon(Appointment appt) {
                String apptId = String.format("APT-%08d", appt.getId());
                String uhid = String.format("UHID-%06d", appt.getPatient().getId());
                String generated = LocalDateTime.now()
                                .format(DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a"));

                Div ribbon = new Div()
                                .setBackgroundColor(C_CARD_BG)
                                .setBorder(new SolidBorder(C_BORDER, 1f))
                                .setBorderRadius(new BorderRadius(6))
                                .setPaddingLeft(16).setPaddingRight(16)
                                .setPaddingTop(10).setPaddingBottom(10)
                                .setMarginBottom(10);

                // 4 columns: appt ID | UHID | generated | payment pill
                Table t = new Table(UnitValue.createPercentArray(new float[] { 28, 24, 26, 22 }))
                                .useAllAvailableWidth();

                t.addCell(ribbonCell("APPOINTMENT ID", apptId, TextAlignment.LEFT));
                t.addCell(ribbonCell("PATIENT UHID", uhid, TextAlignment.LEFT));
                t.addCell(ribbonCell("GENERATED ON", generated, TextAlignment.LEFT));

                // Payment pill cell
                Cell pillCell = new Cell().setBorder(Border.NO_BORDER)
                                .setVerticalAlignment(VerticalAlignment.MIDDLE)
                                .setTextAlignment(TextAlignment.RIGHT);
                pillCell.add(buildPaymentPill(appt));
                t.addCell(pillCell);

                ribbon.add(t);
                return ribbon;
        }

        /** A small inline pill — replaces the heavy payment card. */
        private Div buildPaymentPill(Appointment appt) {
                String rawStatus = appt.getPaymentStatus() != null ? appt.getPaymentStatus().name() : "PENDING";
                String label = rawStatus.replace("_", " ");
                String fee = "Rs. " + String.format("%.0f", appt.getDoctor().getConsultationFee());

                DeviceRgb bg, fg, border;
                switch (rawStatus.toUpperCase()) {
                        case "PAID" -> {
                                bg = C_GREEN_BG;
                                fg = C_GREEN_FG;
                                border = C_GREEN_BORD;
                        }
                        case "FAILED", "CANCELLED" -> {
                                bg = C_RED_BG;
                                fg = C_RED_FG;
                                border = C_RED_BORD;
                        }
                        default -> {
                                bg = C_AMBER_BG;
                                fg = C_AMBER_FG;
                                border = C_AMBER_BORD;
                        }
                }

                Div pill = new Div()
                                .setBackgroundColor(bg)
                                .setBorder(new SolidBorder(border, 1f))
                                .setBorderRadius(new BorderRadius(20))
                                .setPaddingLeft(10).setPaddingRight(10)
                                .setPaddingTop(6).setPaddingBottom(6)
                                .setHorizontalAlignment(HorizontalAlignment.RIGHT)
                                .setTextAlignment(TextAlignment.CENTER);

                pill.add(new Paragraph(label)
                                .setFont(FB).setFontSize(8f).setFontColor(fg)
                                .setTextAlignment(TextAlignment.CENTER).setMargin(0).setMarginBottom(2));
                pill.add(new Paragraph(fee)
                                .setFont(FB).setFontSize(11f).setFontColor(fg)
                                .setTextAlignment(TextAlignment.CENTER).setMargin(0));

                return pill;
        }

        private Cell ribbonCell(String label, String value, TextAlignment align) {
                Cell c = new Cell().setBorder(Border.NO_BORDER).setPaddingRight(10);
                c.add(new Paragraph(label)
                                .setFont(FR).setFontSize(6.5f).setFontColor(C_MUTED)
                                .setTextAlignment(align).setMargin(0).setMarginBottom(3));
                c.add(new Paragraph(value)
                                .setFont(FB).setFontSize(9.5f).setFontColor(C_DARK)
                                .setTextAlignment(align).setMargin(0));
                return c;
        }

        // ═══════════════════════════════════════════════════════════════════════════
        // SECTION 3 – PATIENT + DOCTOR INFO CARDS
        // ═══════════════════════════════════════════════════════════════════════════

        private Table buildInfoCards(Appointment appt) {
                Table t = new Table(UnitValue.createPercentArray(new float[] { 50, 50 }))
                                .useAllAvailableWidth().setMarginBottom(10);
                t.addCell(buildPatientCard(appt));
                t.addCell(buildDoctorCard(appt));
                return t;
        }

        private Cell buildPatientCard(Appointment appt) {
                Cell outer = new Cell()
                                .setBorder(new SolidBorder(C_BORDER, 1f))
                                .setBorderRadius(new BorderRadius(6))
                                .setBackgroundColor(C_CARD_BG)
                                .setPadding(12).setPaddingRight(10);

                addCardTitle(outer, "PATIENT INFORMATION", C_TEAL);
                outer.add(new LineSeparator(new SolidLine(0.4f)).setStrokeColor(C_BORDER).setMarginBottom(8));

                addInfoRow(outer, "Full Name", safe(appt.getPatient().getUser().getName()), true);
                addInfoRow(outer, "Phone", safe(appt.getPatient().getUser().getPhone()), false);
                addInfoRow(outer, "Email", safe(appt.getPatient().getUser().getEmail()), false);

                if (appt.getPatient().getGender() != null)
                        addInfoRow(outer, "Gender", safe(appt.getPatient().getGender()), false);
                if (appt.getPatient().getBloodGroup() != null)
                        addInfoRow(outer, "Blood Group", safe(appt.getPatient().getBloodGroup()), false);

                addInfoRow(outer, "Visit Type",
                                Boolean.TRUE.equals(appt.getIsFirstVisit()) ? "First Visit" : "Follow-Up", false);

                return outer;
        }

        private Cell buildDoctorCard(Appointment appt) {
                Cell outer = new Cell()
                                .setBorder(new SolidBorder(C_BORDER, 1f))
                                .setBorderRadius(new BorderRadius(6))
                                .setBackgroundColor(C_CARD_BG)
                                .setPadding(12).setPaddingLeft(10);

                addCardTitle(outer, "CONSULTING DOCTOR", C_NAVY_MID);
                outer.add(new LineSeparator(new SolidLine(0.4f)).setStrokeColor(C_BORDER).setMarginBottom(8));

                addInfoRowColored(outer, "Name",
                                "Dr. " + safe(appt.getDoctor().getUser().getName()), C_NAVY, true);
                addInfoRow(outer, "Specialization", safe(appt.getDoctor().getSpecialization()), false);
                addInfoRow(outer, "Qualification", safe(appt.getDoctor().getQualification()), false);
                addInfoRow(outer, "Hospital", safe(appt.getDoctor().getHospital()), false);
                addInfoRow(outer, "Contact", safe(appt.getDoctor().getUser().getPhone()), false);
                addInfoRow(outer, "Consult Fee",
                                "Rs. " + String.format("%.0f", appt.getDoctor().getConsultationFee()), false);

                return outer;
        }

        private void addCardTitle(Cell parent, String text, DeviceRgb color) {
                parent.add(new Paragraph(text)
                                .setFont(FB).setFontSize(7.5f).setFontColor(color)
                                .setMargin(0).setMarginBottom(6)
                                .setCharacterSpacing(0.4f));
        }

        private void addInfoRow(Cell parent, String label, String value, boolean boldValue) {
                Table row = new Table(UnitValue.createPercentArray(new float[] { 36, 64 }))
                                .useAllAvailableWidth().setMarginBottom(4);
                row.addCell(new Cell().setBorder(Border.NO_BORDER).setPadding(0)
                                .add(new Paragraph(label)
                                                .setFont(FR).setFontSize(7.5f).setFontColor(C_MUTED).setMargin(0)));
                row.addCell(new Cell().setBorder(Border.NO_BORDER).setPadding(0)
                                .add(new Paragraph(value)
                                                .setFont(boldValue ? FB : FR).setFontSize(8.5f).setFontColor(C_DARK)
                                                .setMargin(0)));
                parent.add(row);
        }

        private void addInfoRowColored(Cell parent, String label, String value, DeviceRgb color, boolean bold) {
                Table row = new Table(UnitValue.createPercentArray(new float[] { 36, 64 }))
                                .useAllAvailableWidth().setMarginBottom(4);
                row.addCell(new Cell().setBorder(Border.NO_BORDER).setPadding(0)
                                .add(new Paragraph(label)
                                                .setFont(FR).setFontSize(7.5f).setFontColor(C_MUTED).setMargin(0)));
                row.addCell(new Cell().setBorder(Border.NO_BORDER).setPadding(0)
                                .add(new Paragraph(value)
                                                .setFont(bold ? FB : FR).setFontSize(8.5f).setFontColor(color)
                                                .setMargin(0)));
                parent.add(row);
        }

        // ═══════════════════════════════════════════════════════════════════════════
        // SECTION 4 – SCHEDULE CARD (compact, light — no heavy navy slab)
        // ═══════════════════════════════════════════════════════════════════════════

        private Div buildScheduleCard(Appointment appt) {
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

                Div card = new Div()
                                .setBackgroundColor(C_CARD_BG)
                                .setBorder(new SolidBorder(C_BORDER, 1f))
                                .setBorderRadius(new BorderRadius(6))
                                .setPaddingLeft(16).setPaddingRight(16)
                                .setPaddingTop(12).setPaddingBottom(12)
                                .setMarginBottom(10);

                // Row label
                card.add(new Paragraph("APPOINTMENT SCHEDULE")
                                .setFont(FB).setFontSize(7.5f).setFontColor(C_NAVY)
                                .setCharacterSpacing(0.4f).setMargin(0).setMarginBottom(10));

                // 4-column schedule row
                Table t = new Table(UnitValue.createPercentArray(new float[] { 36, 28, 20, 16 }))
                                .useAllAvailableWidth();

                // Date column — prominent
                Cell dateCol = new Cell().setBorder(Border.NO_BORDER).setPaddingRight(14);
                dateCol.add(new Paragraph("DATE").setFont(FR).setFontSize(7f).setFontColor(C_SLATE)
                                .setMargin(0).setMarginBottom(3));
                dateCol.add(new Paragraph(date).setFont(FB).setFontSize(10f).setFontColor(C_DARK)
                                .setMargin(0).setFixedLeading(13f));
                t.addCell(dateCol);

                // Time slot
                t.addCell(scheduleCell("TIME SLOT", start + " – " + end, C_DARK));

                // Status pill embedded in cell
                Cell statusCol = new Cell().setBorder(Border.NO_BORDER).setPaddingRight(8)
                                .setVerticalAlignment(VerticalAlignment.TOP);
                statusCol.add(new Paragraph("STATUS").setFont(FR).setFontSize(7f).setFontColor(C_SLATE)
                                .setMargin(0).setMarginBottom(4));

                Div pill = new Div()
                                .setBackgroundColor(sc[0])
                                .setBorder(new SolidBorder(sc[1], 1f))
                                .setBorderRadius(new BorderRadius(12))
                                .setPaddingLeft(8).setPaddingRight(8)
                                .setPaddingTop(3).setPaddingBottom(3);
                pill.add(new Paragraph(statusLabel.replace("_", " "))
                                .setFont(FB).setFontSize(8f).setFontColor(sc[1])
                                .setTextAlignment(TextAlignment.CENTER).setMargin(0));
                statusCol.add(pill);
                t.addCell(statusCol);

                // Duration
                t.addCell(scheduleCell("DURATION", duration, C_SLATE));

                card.add(t);
                return card;
        }

        private Cell scheduleCell(String label, String value, DeviceRgb valColor) {
                Cell c = new Cell().setBorder(Border.NO_BORDER).setPaddingRight(12);
                c.add(new Paragraph(label).setFont(FR).setFontSize(7f).setFontColor(C_SLATE)
                                .setMargin(0).setMarginBottom(3));
                c.add(new Paragraph(value).setFont(FB).setFontSize(10f).setFontColor(valColor)
                                .setMargin(0).setFixedLeading(13f));
                return c;
        }

        private DeviceRgb[] resolveStatusColors(String status) {
                return switch (status) {
                        case "COMPLETED" -> new DeviceRgb[] { C_GREEN_BG, C_GREEN_FG };
                        case "CANCELLED" -> new DeviceRgb[] { C_RED_BG, C_RED_FG };
                        case "NO_SHOW" -> new DeviceRgb[] { C_AMBER_BG, C_AMBER_FG };
                        case "RESCHEDULED" -> new DeviceRgb[] { C_BLUE_BG, C_BLUE_FG };
                        default -> new DeviceRgb[] { C_TEAL_LIGHT, C_TEAL };
                };
        }

        // ═══════════════════════════════════════════════════════════════════════════
        // SECTION 5 – REASON + STATUS
        // ═══════════════════════════════════════════════════════════════════════════

        private Table buildReasonStatusRow(Appointment appt) {
                Table t = new Table(UnitValue.createPercentArray(new float[] { 62, 38 }))
                                .useAllAvailableWidth().setMarginBottom(10);

                // Reason cell
                Cell reasonCell = new Cell()
                                .setBorder(new SolidBorder(C_BORDER, 1f))
                                .setBorderRadius(new BorderRadius(6))
                                .setBackgroundColor(C_CARD_BG)
                                .setPadding(12).setPaddingRight(10);

                reasonCell.add(new Paragraph("REASON FOR VISIT")
                                .setFont(FB).setFontSize(7.5f).setFontColor(C_SLATE)
                                .setCharacterSpacing(0.4f).setMargin(0).setMarginBottom(6));

                String reason = (appt.getReason() != null && !appt.getReason().isBlank())
                                ? appt.getReason()
                                : "Not specified";
                reasonCell.add(new Paragraph(reason)
                                .setFont(FR).setFontSize(9.5f).setFontColor(C_DARK)
                                .setFixedLeading(14f).setMargin(0));

                if (appt.getDoctorNotes() != null && !appt.getDoctorNotes().isBlank()) {
                        reasonCell.add(new Paragraph("DOCTOR'S NOTES")
                                        .setFont(FB).setFontSize(7.5f).setFontColor(C_SLATE)
                                        .setCharacterSpacing(0.4f).setMargin(0).setMarginTop(10).setMarginBottom(4));
                        reasonCell.add(new Paragraph(appt.getDoctorNotes())
                                        .setFont(FI).setFontSize(9f).setFontColor(C_SLATE)
                                        .setFixedLeading(13f).setMargin(0));
                }
                t.addCell(reasonCell);

                // Appointment status cell — clean, no heavy bg
                String apptStatus = appt.getStatus() != null ? appt.getStatus().name() : "SCHEDULED";
                DeviceRgb[] sc = resolveStatusColors(apptStatus);

                Cell statusCell = new Cell()
                                .setBorder(new SolidBorder(sc[1], 1f))
                                .setBorderRadius(new BorderRadius(6))
                                .setBackgroundColor(sc[0])
                                .setPadding(14)
                                .setPaddingLeft(10)
                                .setVerticalAlignment(VerticalAlignment.MIDDLE)
                                .setTextAlignment(TextAlignment.CENTER);

                statusCell.add(new Paragraph("APPOINTMENT STATUS")
                                .setFont(FR).setFontSize(7f).setFontColor(sc[1])
                                .setCharacterSpacing(0.4f)
                                .setTextAlignment(TextAlignment.CENTER).setMargin(0).setMarginBottom(8));

                statusCell.add(new Paragraph(apptStatus.replace("_", " "))
                                .setFont(FB).setFontSize(15f).setFontColor(sc[1])
                                .setTextAlignment(TextAlignment.CENTER).setMargin(0));

                if (appt.getRescheduleCount() != null && appt.getRescheduleCount() > 0) {
                        statusCell.add(new Paragraph("Rescheduled " + appt.getRescheduleCount() + "\u00d7")
                                        .setFont(FR).setFontSize(7.5f).setFontColor(sc[1])
                                        .setTextAlignment(TextAlignment.CENTER).setMarginTop(6).setMargin(0));
                }
                t.addCell(statusCell);

                return t;
        }

        // ═══════════════════════════════════════════════════════════════════════════
        // SECTION 6 – NOTICE BOX
        // ═══════════════════════════════════════════════════════════════════════════

        private Div buildNoticeBox() {
                Div d = new Div()
                                .setBackgroundColor(C_LIGHT_BG)
                                .setBorder(new SolidBorder(C_BORDER, 1f))
                                .setBorderRadius(new BorderRadius(6))
                                .setPadding(11).setPaddingLeft(14)
                                .setMarginBottom(10);

                d.add(new Paragraph("IMPORTANT INSTRUCTIONS")
                                .setFont(FB).setFontSize(7.5f).setFontColor(C_NAVY)
                                .setCharacterSpacing(0.4f).setMargin(0).setMarginBottom(7));

                String[] notices = {
                                "Please arrive 15 minutes before your scheduled appointment time.",
                                "Carry all previous medical records, test reports and prescriptions.",
                                "Cancellations must be made at least 2 hours prior to the appointment.",
                                "Smoking and tobacco products are strictly prohibited on hospital premises.",
                                "This is a computer-generated document. No signature required."
                };

                for (String n : notices) {
                        d.add(new Paragraph("\u2013  " + n)
                                        .setFont(FR).setFontSize(8f).setFontColor(C_SLATE)
                                        .setMargin(0).setMarginBottom(3).setMarginLeft(4));
                }
                return d;
        }

        // ═══════════════════════════════════════════════════════════════════════════
        // SECTION 7 – SIGNATURE AREA
        // ═══════════════════════════════════════════════════════════════════════════

        private Table buildSignatureArea(Appointment appt) {
                Table t = new Table(UnitValue.createPercentArray(new float[] { 42, 16, 42 }))
                                .useAllAvailableWidth().setMarginTop(4);

                // Patient
                Cell patSig = new Cell().setBorder(Border.NO_BORDER);
                patSig.add(new Paragraph("Patient / Guardian Signature")
                                .setFont(FR).setFontSize(8f).setFontColor(C_SLATE).setMarginBottom(22).setMargin(0));
                patSig.add(new LineSeparator(new SolidLine(0.5f)).setStrokeColor(C_BORDER));
                patSig.add(new Paragraph(safe(appt.getPatient().getUser().getName()))
                                .setFont(FB).setFontSize(8f).setFontColor(C_TEAL)
                                .setTextAlignment(TextAlignment.CENTER).setMarginTop(3).setMargin(0));
                t.addCell(patSig);

                t.addCell(new Cell().setBorder(Border.NO_BORDER));

                // Doctor
                Cell docSig = new Cell().setBorder(Border.NO_BORDER);
                docSig.add(new Paragraph("Doctor's Signature & Stamp")
                                .setFont(FR).setFontSize(8f).setFontColor(C_SLATE).setMarginBottom(22).setMargin(0));
                docSig.add(new LineSeparator(new SolidLine(0.5f)).setStrokeColor(C_BORDER));
                docSig.add(new Paragraph("Dr. " + safe(appt.getDoctor().getUser().getName())
                                + "   \u00b7   " + safe(appt.getDoctor().getSpecialization()))
                                .setFont(FB).setFontSize(8f).setFontColor(C_NAVY_MID)
                                .setTextAlignment(TextAlignment.CENTER).setMarginTop(3).setMargin(0));
                t.addCell(docSig);

                return t;
        }

        // ═══════════════════════════════════════════════════════════════════════════
        // PAGE DECORATION – subtle outer border + slim footer
        // ═══════════════════════════════════════════════════════════════════════════

        private void addPageDecoration(PdfDocument pdfDoc) {
                pdfDoc.addEventHandler(PdfDocumentEvent.END_PAGE, event -> {
                        PdfDocumentEvent docEvent = (PdfDocumentEvent) event;
                        PdfPage page = docEvent.getPage();
                        PdfCanvas canvas = new PdfCanvas(page);
                        try {
                                float w = PageSize.A4.getWidth();
                                float h = PageSize.A4.getHeight();
                                float m = 14f;

                                // Subtle outer border
                                canvas.setStrokeColor(C_BORDER).setLineWidth(0.8f)
                                                .rectangle(m, m, w - 2 * m, h - 2 * m).stroke();

                                // Minimal footer strip
                                float footerH = 16f;
                                canvas.setFillColor(C_LIGHT_BG)
                                                .rectangle(m, m, w - 2 * m, footerH).fill();

                                PdfFont fr = PdfFontFactory.createFont(StandardFonts.HELVETICA);

                                // Footer left text
                                canvas.setFillColor(C_MUTED).setFontAndSize(fr, 6.5f)
                                                .beginText()
                                                .moveText(m + 12, m + 6)
                                                .showText(HOSPITAL_NAME + "   |   " + WEBSITE + "   |   Helpline: "
                                                                + SUPPORT_PHONE)
                                                .endText();

                                // Footer right text
                                canvas.setFillColor(C_MUTED).setFontAndSize(fr, 6.5f)
                                                .beginText()
                                                .moveText(w - m - 210, m + 6)
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