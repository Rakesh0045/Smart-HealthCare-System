package com.healthcare.service;

import com.healthcare.entity.Appointment;
import com.itextpdf.io.font.constants.StandardFonts;
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.geom.PageSize;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.borders.SolidBorder;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.time.format.DateTimeFormatter;

@Service
@RequiredArgsConstructor
public class AppointmentSlipPdfService {

    private static final DeviceRgb PRIMARY = new DeviceRgb(37, 99, 235);
    private static final DeviceRgb PRIMARY_LIGHT = new DeviceRgb(239, 246, 255);
    private static final DeviceRgb TEXT = new DeviceRgb(15, 23, 42);
    private static final DeviceRgb MUTED = new DeviceRgb(100, 116, 139);

    public byte[] generateSlip(Appointment appointment, String title, String subtitle) {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            PdfWriter writer = new PdfWriter(baos);
            PdfDocument pdf = new PdfDocument(writer);
            Document document = new Document(pdf, PageSize.A4);
            document.setMargins(24, 24, 28, 24);

            var bold = com.itextpdf.kernel.font.PdfFontFactory.createFont(StandardFonts.HELVETICA_BOLD);
            var regular = com.itextpdf.kernel.font.PdfFontFactory.createFont(StandardFonts.HELVETICA);

            document.add(new Paragraph("MediCare").setFont(bold).setFontSize(24).setFontColor(PRIMARY)
                    .setTextAlignment(TextAlignment.CENTER).setMarginBottom(0));
            document.add(new Paragraph(title).setFont(bold).setFontSize(14).setFontColor(TEXT)
                    .setTextAlignment(TextAlignment.CENTER).setMarginTop(2).setMarginBottom(2));
            document.add(new Paragraph(subtitle).setFont(regular).setFontSize(9).setFontColor(MUTED)
                    .setTextAlignment(TextAlignment.CENTER).setMarginBottom(14));

            Table meta = new Table(UnitValue.createPercentArray(new float[] { 50, 50 })).useAllAvailableWidth();
            meta.addCell(
                    infoCell("Appointment #", "APPT-" + String.format("%05d", appointment.getId()), bold, regular));
            meta.addCell(infoCell("Status", String.valueOf(appointment.getStatus()), bold, regular));
            meta.addCell(infoCell("Date",
                    appointment.getAppointmentDate().format(DateTimeFormatter.ofPattern("dd MMM yyyy")), bold,
                    regular));
            meta.addCell(
                    infoCell("Time",
                            appointment.getStartTime().format(DateTimeFormatter.ofPattern("hh:mm a")) + " - "
                                    + appointment.getEndTime().format(DateTimeFormatter.ofPattern("hh:mm a")),
                            bold, regular));
            document.add(meta.setMarginBottom(14));

            Table block = new Table(UnitValue.createPercentArray(new float[] { 50, 50 })).useAllAvailableWidth();
            block.addCell(sectionCell("Patient Details", bold, regular,
                    appointment.getPatient().getUser().getName(),
                    appointment.getPatient().getUser().getEmail(),
                    appointment.getPatient().getUser().getPhone()));
            block.addCell(sectionCell("Doctor Details", bold, regular,
                    "Dr. " + appointment.getDoctor().getUser().getName(),
                    appointment.getDoctor().getSpecialization(),
                    appointment.getDoctor().getHospital()));
            document.add(block.setMarginBottom(14));

            document.add(
                    new Paragraph("Visit Summary").setFont(bold).setFontSize(12).setFontColor(TEXT).setMarginBottom(6));
            Table visit = new Table(UnitValue.createPercentArray(new float[] { 24, 76 })).useAllAvailableWidth();
            visit.addCell(labelCell("Reason", bold));
            visit.addCell(valueCell(appointment.getReason() != null ? appointment.getReason() : "General consultation",
                    regular));
            visit.addCell(labelCell("Payment", bold));
            visit.addCell(valueCell(String.valueOf(appointment.getPaymentStatus()), regular));
            visit.addCell(labelCell("Fee", bold));
            visit.addCell(valueCell("₹" + appointment.getDoctor().getConsultationFee(), regular));
            document.add(visit);

            document.add(new Paragraph("Please keep this slip handy during your visit.")
                    .setFont(regular).setFontSize(9).setFontColor(MUTED)
                    .setTextAlignment(TextAlignment.CENTER).setMarginTop(18));

            document.close();
            return baos.toByteArray();
        } catch (Exception e) {
            throw new IllegalStateException("Unable to generate appointment slip PDF", e);
        }
    }

    private Cell infoCell(String label, String value, com.itextpdf.kernel.font.PdfFont bold,
            com.itextpdf.kernel.font.PdfFont regular) {
        Cell cell = new Cell().setBorder(new SolidBorder(PRIMARY_LIGHT, 1)).setBackgroundColor(PRIMARY_LIGHT)
                .setPadding(10);
        cell.add(new Paragraph(label).setFont(bold).setFontSize(9).setFontColor(PRIMARY).setMarginBottom(3));
        cell.add(new Paragraph(value).setFont(regular).setFontSize(10.5f).setFontColor(TEXT).setMargin(0));
        return cell;
    }

    private Cell sectionCell(String title, com.itextpdf.kernel.font.PdfFont bold,
            com.itextpdf.kernel.font.PdfFont regular, String... lines) {
        Cell cell = new Cell().setBorder(new SolidBorder(PRIMARY_LIGHT, 1)).setPadding(10);
        cell.add(new Paragraph(title).setFont(bold).setFontSize(10).setFontColor(PRIMARY).setMarginBottom(6));
        for (String line : lines) {
            if (line != null && !line.isBlank()) {
                cell.add(new Paragraph(line).setFont(regular).setFontSize(10.5f).setFontColor(TEXT).setMarginBottom(2));
            }
        }
        return cell;
    }

    private Cell labelCell(String label, com.itextpdf.kernel.font.PdfFont bold) {
        return new Cell().add(new Paragraph(label).setFont(bold).setFontSize(10).setFontColor(PRIMARY).setMargin(0))
                .setBackgroundColor(PRIMARY_LIGHT).setBorder(new SolidBorder(PRIMARY_LIGHT, 1)).setPadding(8);
    }

    private Cell valueCell(String value, com.itextpdf.kernel.font.PdfFont regular) {
        return new Cell().add(new Paragraph(value).setFont(regular).setFontSize(10.5f).setFontColor(TEXT).setMargin(0))
                .setBorder(new SolidBorder(PRIMARY_LIGHT, 1)).setPadding(8);
    }
}