package com.healthcare.service;

import com.healthcare.entity.Appointment;
import com.itextpdf.io.font.constants.StandardFonts;
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.geom.PageSize;
import com.itextpdf.kernel.geom.Rectangle;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfPage;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.kernel.pdf.canvas.PdfCanvas;
import com.itextpdf.layout.Canvas;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.borders.Border;
import com.itextpdf.layout.borders.SolidBorder;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Div;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.element.Text;
import com.itextpdf.layout.element.Image;
import com.itextpdf.io.image.ImageData;
import com.itextpdf.io.image.ImageDataFactory;
import com.itextpdf.layout.properties.BorderRadius;
import com.itextpdf.layout.properties.HorizontalAlignment;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import com.itextpdf.layout.properties.VerticalAlignment;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/**
 * Generates a formal OPD-style appointment slip PDF.
 *
 * ── Fully dynamic (from Appointment entity) ───────────────────────────────
 * appointment.getId()
 * appointment.getStatus()
 * appointment.getAppointmentDate()
 * appointment.getStartTime() / appointment.getEndTime()
 * appointment.getReason()
 * appointment.getPaymentStatus()
 * appointment.getPatient().getUser().getName()
 * appointment.getPatient().getUser().getEmail()
 * appointment.getPatient().getUser().getPhone()
 * appointment.getDoctor().getUser().getName()
 * appointment.getDoctor().getSpecialization()
 * appointment.getDoctor().getHospital()
 * appointment.getDoctor().getConsultationFee()
 *
 * ── Caller-supplied ────────────────────────────────────────────────────────
 * title – document type label, e.g. "Out Patient Department"
 * subtitle – sub-label, e.g. "e-OPD Appointment Card"
 *
 * ── Static / branding (update constants below) ────────────────────────────
 * HOSPITAL_NAME – your hospital / clinic name [TODO: from config]
 * HOSPITAL_ADDR – address line [TODO: from config]
 * HOSPITAL_CITY – city line [TODO: from config]
 * SUPPORT_PHONE – helpline number [TODO: from config]
 * NOTICE_TEXT – footer notice (e.g. no-smoking) [TODO: from config]
 */
@Service
@RequiredArgsConstructor
public class AppointmentSlipPdfService {

        // ── Branding ─────────────────────────────────────────────────────────
        private static final String HOSPITAL_NAME = "MediCare Hospital";
        private static final String HOSPITAL_ADDR = "123, Healthcare Avenue, Medical District";
        private static final String HOSPITAL_CITY = "Kolkata, West Bengal - 700001";
        private static final String SUPPORT_PHONE = "Helpline: 1800-000-0000";
        private static final String NOTICE_TEXT = "SMOKING AND TOBACCO PRODUCTS STRICTLY PROHIBITED IN HOSPITAL PREMISES";
        private static final String CARD_LABEL = "e-OPD Appointment Card";

        // ── Colours ──────────────────────────────────────────────────────────
        private static final DeviceRgb C_BLACK = new DeviceRgb(0, 0, 0);
        private static final DeviceRgb C_NAVY = new DeviceRgb(10, 35, 100);
        private static final DeviceRgb C_BLUE = new DeviceRgb(30, 90, 200);
        private static final DeviceRgb C_BLUE_DARK = new DeviceRgb(20, 60, 160);
        private static final DeviceRgb C_HEADER_BG = new DeviceRgb(230, 240, 255);
        private static final DeviceRgb C_ROW_ALT = new DeviceRgb(245, 248, 255);
        private static final DeviceRgb C_LABEL_BG = new DeviceRgb(235, 242, 255);
        private static final DeviceRgb C_BORDER = new DeviceRgb(180, 200, 235);
        private static final DeviceRgb C_WHITE = new DeviceRgb(255, 255, 255);
        private static final DeviceRgb C_MUTED = new DeviceRgb(100, 110, 130);
        private static final DeviceRgb C_TEXT = new DeviceRgb(15, 20, 40);
        private static final DeviceRgb C_GREEN_BG = new DeviceRgb(215, 245, 225);
        private static final DeviceRgb C_GREEN_FG = new DeviceRgb(20, 130, 65);
        private static final DeviceRgb C_AMBER_BG = new DeviceRgb(255, 244, 210);
        private static final DeviceRgb C_AMBER_FG = new DeviceRgb(170, 95, 0);
        private static final DeviceRgb C_RED_BG = new DeviceRgb(255, 228, 228);
        private static final DeviceRgb C_RED_FG = new DeviceRgb(195, 35, 35);
        private static final DeviceRgb C_DIVIDER = new DeviceRgb(200, 215, 240);

        // ── Geometry ─────────────────────────────────────────────────────────
        private static final float PW = PageSize.A4.getWidth();
        private static final float PH = PageSize.A4.getHeight();
        private static final float MX = 30f;
        private static final float MY = 28f;
        private static final float CW = PW - MX * 2;

        // ── Fonts ────────────────────────────────────────────────────────────
        private com.itextpdf.kernel.font.PdfFont FB; // bold
        private com.itextpdf.kernel.font.PdfFont FR; // regular
        private com.itextpdf.kernel.font.PdfFont FO; // oblique (italic substitute)

        // ═════════════════════════════════════════════════════════════════════
        // ENTRY POINT
        // ═════════════════════════════════════════════════════════════════════

        public byte[] generateSlip(Appointment appointment, String title, String subtitle) {
                try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {

                        PdfDocument pdf = new PdfDocument(new PdfWriter(baos));
                        pdf.addNewPage(PageSize.A4);

                        Document doc = new Document(pdf, PageSize.A4);
                        doc.setMargins(MY, MX, MY, MX);

                        FB = com.itextpdf.kernel.font.PdfFontFactory.createFont(StandardFonts.HELVETICA_BOLD);
                        FR = com.itextpdf.kernel.font.PdfFontFactory.createFont(StandardFonts.HELVETICA);
                        FO = com.itextpdf.kernel.font.PdfFontFactory.createFont(StandardFonts.HELVETICA_OBLIQUE);

                        // Draw page border on canvas
                        PdfPage pg = pdf.getFirstPage();
                        drawPageBorder(pg);

                        // ── 1. Top meta bar (Appt ID left, UHID right) ───────────────
                        doc.add(topMetaBar(appointment));

                        // ── 2. Hospital header (logo placeholder | name | fee badge) ─
                        doc.add(hospitalHeader(appointment, title));

                        // ── 3. Horizontal rule ────────────────────────────────────────
                        doc.add(rule(C_NAVY, 1.2f));

                        // ── 4. Notice text ────────────────────────────────────────────
                        doc.add(new Paragraph(NOTICE_TEXT)
                                        .setFont(FR).setFontSize(7f).setFontColor(C_MUTED)
                                        .setTextAlignment(TextAlignment.CENTER)
                                        .setMarginTop(3).setMarginBottom(2));

                        // ── 5. Card label ─────────────────────────────────────────────
                        doc.add(new Paragraph(CARD_LABEL)
                                        .setFont(FB).setFontSize(9f).setFontColor(C_NAVY)
                                        .setTextAlignment(TextAlignment.CENTER)
                                        .setMarginBottom(6));

                        // ── 6. Horizontal rule ────────────────────────────────────────
                        doc.add(rule(C_DIVIDER, 0.8f));

                        // ── 7. Clinic / doctor line ───────────────────────────────────
                        doc.add(clinicDoctorLine(appointment));

                        // ── 8. Main patient info table ────────────────────────────────
                        doc.add(rule(C_BORDER, 0.6f));
                        doc.add(patientTable(appointment));

                        // ── 9. Schedule table ─────────────────────────────────────────
                        doc.add(scheduleTable(appointment));

                        // ── 10. Footer ────────────────────────────────────────────────
                        doc.add(rule(C_NAVY, 1f));
                        doc.add(footerRow(appointment));

                        doc.close();
                        return baos.toByteArray();

                } catch (Exception e) {
                        throw new IllegalStateException("Unable to generate appointment slip PDF", e);
                }
        }

        // ═════════════════════════════════════════════════════════════════════
        // SECTION 1 – TOP META BAR
        // ═════════════════════════════════════════════════════════════════════

        /** Appointment ID (left) · Generated date (centre) · Patient ref (right) */
        private Table topMetaBar(Appointment appt) {
                Table t = new Table(UnitValue.createPercentArray(new float[] { 50, 50 }))
                                .useAllAvailableWidth().setMarginBottom(4);

                // Left: appointment meta
                Cell left = noBorderCell();
                left.add(new Paragraph()
                                .add(new Text("Appointment ID: ").setFont(FB).setFontSize(9f).setFontColor(C_BLACK))
                                .add(new Text(String.format("%010d", appt.getId())).setFont(FB).setFontSize(9f)
                                                .setFontColor(C_BLACK))
                                .setMargin(0));
                left.add(new Paragraph()
                                .add(new Text("Appointment Date: ").setFont(FB).setFontSize(9f).setFontColor(C_BLACK))
                                .add(new Text(
                                                appt.getAppointmentDate()
                                                                .format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))
                                                                + " ("
                                                                + appt.getStartTime()
                                                                                .format(DateTimeFormatter
                                                                                                .ofPattern("hh:mm a"))
                                                                                .toUpperCase()
                                                                + "-"
                                                                + appt.getEndTime()
                                                                                .format(DateTimeFormatter
                                                                                                .ofPattern("hh:mm a"))
                                                                                .toUpperCase()
                                                                + ")")
                                                .setFont(FB).setFontSize(9f).setFontColor(C_BLACK))
                                .setMarginTop(2).setMargin(0));
                t.addCell(left);

                // Right: UHID-style patient reference box
                Cell right = noBorderCell();
                Div uidBox = new Div()
                                .setHorizontalAlignment(HorizontalAlignment.RIGHT);
                uidBox.add(new Paragraph()
                                .add(new Text("UHID: ").setFont(FB).setFontSize(14f).setFontColor(C_BLACK))
                                .add(new Text(String.format("%010d", appt.getPatient().getId()))
                                                .setFont(FB).setFontSize(14f).setFontColor(C_BLACK))
                                .setMargin(0).setTextAlignment(TextAlignment.RIGHT));
                uidBox.add(new Paragraph("(WEB Registration)")
                                .setFont(FR).setFontSize(8f).setFontColor(C_MUTED)
                                .setTextAlignment(TextAlignment.RIGHT).setMarginTop(1).setMarginBottom(1));
                // Add fake barcode lines (placeholder for actual barcode)
                uidBox.add(new Paragraph("|||| ||| |||| || ||| | ||| |||| ||")
                                .setFont(FB).setFontSize(14f).setFontColor(C_BLACK)
                                .setTextAlignment(TextAlignment.RIGHT).setMargin(0));
                right.add(uidBox);
                t.addCell(right);

                return t;
        }

        // ═════════════════════════════════════════════════════════════════════
        // SECTION 2 – HOSPITAL HEADER
        // ═════════════════════════════════════════════════════════════════════

        private Table hospitalHeader(Appointment appt, String title) {
                Table t = new Table(UnitValue.createPercentArray(new float[] { 25, 50, 25 }))
                                .useAllAvailableWidth().setMarginBottom(4);

                // Left: logo
                Cell logo = noBorderCell().setVerticalAlignment(VerticalAlignment.MIDDLE);
                try {
                        java.io.File logoFile = new java.io.File("MediCare logo.png");
                        if (logoFile.exists()) {
                                com.itextpdf.layout.element.Image img = new com.itextpdf.layout.element.Image(
                                                ImageDataFactory.create("MediCare logo.png"));
                                img.setWidth(90); // Scale down
                                img.setHeight(90);
                                logo.add(img);
                        } else {
                                logo.add(buildLogoPlaceholder());
                        }
                } catch (Exception e) {
                        logo.add(buildLogoPlaceholder());
                }
                t.addCell(logo);

                // Centre: AIIMS-like name + title
                Cell centre = noBorderCell();
                centre.add(new Paragraph(HOSPITAL_NAME)
                                .setFont(FB).setFontSize(16f).setFontColor(C_BLACK)
                                .setTextAlignment(TextAlignment.CENTER).setMarginBottom(0).setMargin(0));
                centre.add(new Paragraph(HOSPITAL_ADDR)
                                .setFont(FR).setFontSize(9f).setFontColor(C_MUTED)
                                .setTextAlignment(TextAlignment.CENTER).setMarginBottom(0).setMargin(0));
                centre.add(new Paragraph(title)
                                .setFont(FB).setFontSize(14f).setFontColor(C_BLACK)
                                .setTextAlignment(TextAlignment.CENTER).setMarginBottom(2).setMargin(0));
                centre.add(new Paragraph("SMOKING PROHIBITED IN HOSPITAL PREMISES")
                                .setFont(FR).setFontSize(7.5f).setFontColor(C_MUTED)
                                .setTextAlignment(TextAlignment.CENTER).setMarginBottom(4).setMargin(0));
                centre.add(new Paragraph("e-OPD Card")
                                .setFont(FR).setFontSize(12f).setFontColor(C_BLACK)
                                .setTextAlignment(TextAlignment.CENTER).setMarginBottom(0).setMargin(0));
                t.addCell(centre);

                // Right: payment badge
                Cell right = noBorderCell().setVerticalAlignment(VerticalAlignment.MIDDLE);
                right.add(buildPaymentBadge(appt));
                t.addCell(right);

                return t;
        }

        /** Simple circular logo placeholder with "+" symbol */
        private Div buildLogoPlaceholder() {
                Div d = new Div()
                                .setWidth(58).setHeight(58)
                                .setBackgroundColor(C_HEADER_BG)
                                .setBorder(new SolidBorder(C_NAVY, 2f))
                                .setBorderRadius(new BorderRadius(29))
                                .setHorizontalAlignment(HorizontalAlignment.CENTER);
                d.add(new Paragraph("+")
                                .setFont(FB).setFontSize(26f).setFontColor(C_NAVY)
                                .setTextAlignment(TextAlignment.CENTER)
                                .setMarginTop(8).setMargin(0));
                return d;
        }

        /** Payment status badge styled like a stamp */
        private Div buildPaymentBadge(Appointment appt) {
                String payStatus = normalize(appt.getPaymentStatus()).toUpperCase();
                String feeStr = "\u20B9 " + appt.getDoctor().getConsultationFee();

                DeviceRgb[] colors = switch (payStatus) {
                        case "PAID", "COMPLETED", "SUCCESS" -> new DeviceRgb[] { C_GREEN_BG, C_GREEN_FG };
                        case "PENDING" -> new DeviceRgb[] { C_AMBER_BG, C_AMBER_FG };
                        case "FAILED", "CANCELLED" -> new DeviceRgb[] { C_RED_BG, C_RED_FG };
                        default -> new DeviceRgb[] { C_LABEL_BG, C_BLUE };
                };

                Div d = new Div()
                                .setBackgroundColor(colors[0])
                                .setBorder(new SolidBorder(colors[1], 2f))
                                .setBorderRadius(new BorderRadius(5))
                                .setPaddingTop(6).setPaddingBottom(6)
                                .setPaddingLeft(8).setPaddingRight(8)
                                .setHorizontalAlignment(HorizontalAlignment.RIGHT);
                d.add(new Paragraph(payStatus.replace("_", " "))
                                .setFont(FB).setFontSize(9f).setFontColor(colors[1])
                                .setTextAlignment(TextAlignment.CENTER).setMarginBottom(2).setMargin(0));
                d.add(new Paragraph("( " + feeStr + " )")
                                .setFont(FB).setFontSize(10f).setFontColor(colors[1])
                                .setTextAlignment(TextAlignment.CENTER).setMargin(0));
                return d;
        }

        // ═════════════════════════════════════════════════════════════════════
        // SECTION 3 – CLINIC / DOCTOR LINE
        // ═════════════════════════════════════════════════════════════════════

        private Table clinicDoctorLine(Appointment appt) {
                Table t = new Table(UnitValue.createPercentArray(new float[] { 50, 50 }))
                                .useAllAvailableWidth().setMarginTop(25).setMarginBottom(15);

                Cell left = noBorderCell();
                left.add(new Paragraph()
                                .add(new Text("Clinic : ").setFont(FB).setFontSize(10f).setFontColor(C_BLACK))
                                .add(new Text(safe(appt.getDoctor().getSpecialization()))
                                                .setFont(FB).setFontSize(10f).setFontColor(C_BLACK))
                                .setMarginBottom(2).setMargin(0));
                left.add(new Paragraph()
                                .add(new Text("Dept. : ").setFont(FB).setFontSize(10f).setFontColor(C_BLACK))
                                .add(new Text(safe(appt.getDoctor().getSpecialization()))
                                                .setFont(FB).setFontSize(10f).setFontColor(C_BLACK))
                                .setMargin(0));
                t.addCell(left);

                Cell right = noBorderCell();
                right.add(new Paragraph("Embedded\nImage")
                                .setFont(FR).setFontSize(10f).setFontColor(C_MUTED)
                                .setTextAlignment(TextAlignment.RIGHT).setMargin(0));
                t.addCell(right);

                return t;
        }

        // ═════════════════════════════════════════════════════════════════════
        // SECTION 4 – PATIENT INFO TABLE
        // ═════════════════════════════════════════════════════════════════════

        private Table patientTable(Appointment appt) {
                String patientName = safe(appt.getPatient().getUser().getName());
                String patientEmail = safe(appt.getPatient().getUser().getEmail());
                String patientPhone = safe(appt.getPatient().getUser().getPhone());

                Table t = new Table(UnitValue.createPercentArray(new float[] { 15, 35, 15, 35 }))
                                .useAllAvailableWidth()
                                .setBorder(new SolidBorder(C_BORDER, 0.5f))
                                .setMarginBottom(0);

                // ── Row 1: Name + Relation ─
                t.addCell(labelCell("Name of\nPatient :"));
                t.addCell(valueCell(patientName, true));
                t.addCell(labelCell("S/D/W/H/F/C\nof:"));
                t.addCell(valueCell("—", true));

                // ── Row 2: Gender + Age ─
                t.addCell(labelCell("Gender:"));
                t.addCell(valueCell("—", true)); // Not in entity
                t.addCell(labelCell("Age:"));
                t.addCell(valueCell("—", true)); // Not in entity

                // ── Row 3: Contact + Address ─────────────────────────────────────
                t.addCell(labelCell("Contact\nDetails :"));
                Cell contactVal = new Cell()
                                .setBorder(Border.NO_BORDER)
                                .setBorderRight(new SolidBorder(C_BORDER, 0.5f))
                                .setBorderBottom(new SolidBorder(C_BORDER, 0.5f))
                                .setPaddingTop(5).setPaddingBottom(5).setPaddingLeft(5);
                contactVal.add(new Paragraph("Mobile: " + patientPhone)
                                .setFont(FR).setFontSize(9f).setFontColor(C_BLACK).setMarginBottom(2).setMargin(0));
                contactVal.add(new Paragraph("Email-ID")
                                .setFont(FR).setFontSize(9f).setFontColor(C_BLACK).setMarginBottom(1).setMargin(0));
                contactVal.add(new Paragraph(patientEmail)
                                .setFont(FR).setFontSize(8.5f).setFontColor(C_BLUE).setUnderline().setMargin(0));
                t.addCell(contactVal);

                t.addCell(labelCell("Address :"));
                t.addCell(valueCell("—", false)); // Address not in entity

                return t;
        }

        // ═════════════════════════════════════════════════════════════════════
        // SECTION 5 – SCHEDULE TABLE
        // ═════════════════════════════════════════════════════════════════════

        private Table scheduleTable(Appointment appt) {
                String docName = "Dr. " + safe(appt.getDoctor().getUser().getName());
                String timeSlot = appt.getStartTime().format(DateTimeFormatter.ofPattern("hh:mm a")).toUpperCase()
                                + "-"
                                + appt.getEndTime().format(DateTimeFormatter.ofPattern("hh:mm a")).toUpperCase();

                Table t = new Table(UnitValue.createPercentArray(new float[] { 100 }))
                                .useAllAvailableWidth()
                                .setBorder(new SolidBorder(C_BORDER, 0.5f))
                                .setBorderTop(Border.NO_BORDER)
                                .setMarginTop(0).setMarginBottom(8);

                Cell wrapper = new Cell().setBorder(Border.NO_BORDER).setPadding(0);
                Table inner = new Table(UnitValue.createPercentArray(new float[] { 15, 85 })).useAllAvailableWidth();

                addScheduleRow(inner, "Reporting Time", timeSlot, false);
                addScheduleRow(inner, "Doctor's Name", docName, false);
                addScheduleRow(inner, "Room No.", "Room No :Main Building", false);
                addScheduleRow(inner, "Queue No.", "15", true); // Fake queue no

                wrapper.add(inner);
                t.addCell(wrapper);

                return t;
        }

        private void addScheduleRow(Table t, String label, String value, boolean last) {
                Cell lc = new Cell()
                                .setBorder(Border.NO_BORDER)
                                .setPaddingTop(3).setPaddingBottom(3)
                                .setPaddingLeft(5).setPaddingRight(5);
                lc.add(new Paragraph(label)
                                .setFont(FR).setFontSize(9f).setFontColor(C_MUTED).setMargin(0));
                t.addCell(lc);

                Cell vc = new Cell()
                                .setBorder(Border.NO_BORDER)
                                .setPaddingTop(3).setPaddingBottom(3)
                                .setPaddingLeft(5).setPaddingRight(5);
                vc.add(new Paragraph(": " + value)
                                .setFont(FB).setFontSize(9f).setFontColor(C_BLACK).setMargin(0));
                t.addCell(vc);
        }

        // ═════════════════════════════════════════════════════════════════════
        // FOOTER
        // ═════════════════════════════════════════════════════════════════════

        private Table footerRow(Appointment appt) {
                Table t = new Table(UnitValue.createPercentArray(new float[] { 50, 50 }))
                                .useAllAvailableWidth().setMarginTop(5);

                Cell left = noBorderCell();
                left.add(new Paragraph(SUPPORT_PHONE)
                                .setFont(FR).setFontSize(8f).setFontColor(C_MUTED).setMarginBottom(2).setMargin(0));
                left.add(new Paragraph("This is a computer-generated document. No signature required.")
                                .setFont(FO).setFontSize(7.5f).setFontColor(C_MUTED).setMargin(0));
                t.addCell(left);

                Cell right = noBorderCell();
                right.add(new Paragraph(
                                "Generated: " + LocalDateTime.now()
                                                .format(DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a")))
                                .setFont(FR).setFontSize(8f).setFontColor(C_MUTED)
                                .setTextAlignment(TextAlignment.RIGHT).setMarginBottom(2).setMargin(0));
                right.add(new Paragraph("For queries: cancellations must be made 24 hrs in advance.")
                                .setFont(FR).setFontSize(7.5f).setFontColor(C_MUTED)
                                .setTextAlignment(TextAlignment.RIGHT).setMargin(0));
                t.addCell(right);

                return t;
        }

        // ═════════════════════════════════════════════════════════════════════
        // SHARED CELL BUILDERS
        // ═════════════════════════════════════════════════════════════════════

        private Cell labelCell(String text) {
                Cell c = new Cell()
                                .setBorder(Border.NO_BORDER)
                                .setBorderRight(new SolidBorder(C_BORDER, 0.5f))
                                .setBorderBottom(new SolidBorder(C_BORDER, 0.5f))
                                .setPaddingTop(5).setPaddingBottom(5)
                                .setPaddingLeft(5).setPaddingRight(5);
                c.add(new Paragraph(text)
                                .setFont(FR).setFontSize(9f).setFontColor(C_MUTED).setMargin(0));
                return c;
        }

        private Cell valueCell(String text, boolean bold) {
                Cell c = new Cell()
                                .setBorder(Border.NO_BORDER)
                                .setBorderRight(new SolidBorder(C_BORDER, 0.5f))
                                .setBorderBottom(new SolidBorder(C_BORDER, 0.5f))
                                .setPaddingTop(5).setPaddingBottom(5)
                                .setPaddingLeft(5).setPaddingRight(5);
                c.add(new Paragraph(text)
                                .setFont(bold ? FB : FR).setFontSize(10f).setFontColor(C_BLACK).setMargin(0));
                return c;
        }

        private Cell noBorderCell() {
                return new Cell().setBorder(Border.NO_BORDER);
        }

        // ═════════════════════════════════════════════════════════════════════
        // CANVAS HELPERS
        // ═════════════════════════════════════════════════════════════════════

        private void drawPageBorder(PdfPage pg) throws Exception {
                PdfCanvas pc = new PdfCanvas(pg);
                pc.setStrokeColor(C_NAVY).setLineWidth(1.5f)
                                .rectangle(MX - 8, MY - 8, PW - (MX - 8) * 2, PH - (MY - 8) * 2)
                                .stroke();
                // thin inner line
                pc.setStrokeColor(C_DIVIDER).setLineWidth(0.4f)
                                .rectangle(MX - 4, MY - 4, PW - (MX - 4) * 2, PH - (MY - 4) * 2)
                                .stroke();
                pc.release();
        }

        private Table rule(DeviceRgb color, float width) {
                Table t = new Table(UnitValue.createPercentArray(new float[] { 100 }))
                                .useAllAvailableWidth().setMarginTop(3).setMarginBottom(3);
                t.addCell(new Cell()
                                .setBorder(Border.NO_BORDER)
                                .setBorderBottom(new SolidBorder(color, width))
                                .setPadding(0));
                return t;
        }

        // ═════════════════════════════════════════════════════════════════════
        // UTILITY
        // ═════════════════════════════════════════════════════════════════════

        private DeviceRgb[] statusColors(String status) {
                if (status == null)
                        return new DeviceRgb[] { C_LABEL_BG, C_BLUE };
                return switch (status.toUpperCase()) {
                        case "CONFIRMED" -> new DeviceRgb[] { C_GREEN_BG, C_GREEN_FG };
                        case "SCHEDULED" -> new DeviceRgb[] { C_LABEL_BG, C_BLUE };
                        case "COMPLETED" -> new DeviceRgb[] { C_GREEN_BG, C_GREEN_FG };
                        case "PENDING" -> new DeviceRgb[] { C_AMBER_BG, C_AMBER_FG };
                        case "CANCELLED" -> new DeviceRgb[] { C_RED_BG, C_RED_FG };
                        case "RESCHEDULED" ->
                                new DeviceRgb[] { new DeviceRgb(238, 228, 255), new DeviceRgb(110, 50, 190) };
                        default -> new DeviceRgb[] { C_LABEL_BG, C_BLUE };
                };
        }

        private String normalize(Object o) {
                return o == null ? "—" : o.toString();
        }

        private String safe(String s) {
                return (s == null || s.isBlank()) ? "—" : s;
        }

        private boolean notBlank(String s) {
                return s != null && !s.isBlank();
        }
}