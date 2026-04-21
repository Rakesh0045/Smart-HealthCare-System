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
import com.itextpdf.layout.Document;
import com.itextpdf.layout.borders.Border;
import com.itextpdf.layout.borders.SolidBorder;
import com.itextpdf.layout.element.*;
import com.itextpdf.layout.properties.*;
import com.itextpdf.layout.element.LineSeparator;
import com.itextpdf.kernel.pdf.canvas.draw.SolidLine;
import com.itextpdf.kernel.pdf.canvas.draw.DashedLine;
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

        @Transactional
        public PrescriptionResponse addPrescription(PrescriptionRequest req, Long doctorUserId) {
                Appointment appointment = appointmentRepo.findById(req.getAppointmentId())
                                .orElseThrow(() -> new ResourceNotFoundException("Appointment",
                                                req.getAppointmentId()));

                if (!appointment.getDoctor().getUser().getId().equals(doctorUserId)) {
                        throw new BadRequestException("You can only add prescriptions for your own appointments.");
                }
                if (prescriptionRepo.existsByAppointmentId(req.getAppointmentId())) {
                        throw new ConflictException("Prescription already exists for this appointment.");
                }

                Prescription prescription = Prescription.builder()
                                .appointment(appointment)
                                .doctor(appointment.getDoctor())
                                .patient(appointment.getPatient())
                                .diagnosis(req.getDiagnosis())
                                .additionalNotes(req.getAdditionalNotes())
                                .followUpDate(req.getFollowUpDate())
                                .build();

                if (req.getMedicines() != null) {
                        List<PrescriptionMedicine> medicines = req.getMedicines().stream().map(m -> {
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
                        prescription.setMedicines(medicines);
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
        public PrescriptionResponse getPrescription(Long prescriptionId) {
                return prescriptionRepo.findById(prescriptionId)
                                .map(this::mapToResponse)
                                .orElseThrow(() -> new ResourceNotFoundException("Prescription", prescriptionId));
        }

        @Transactional(readOnly = true)
        public PrescriptionResponse getPrescriptionByAppointment(Long appointmentId) {
                return prescriptionRepo.findByAppointmentId(appointmentId)
                                .map(this::mapToResponse)
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
                        document.setMargins(36, 36, 36, 36);

                        PdfFont bold = PdfFontFactory.createFont(StandardFonts.HELVETICA_BOLD);
                        PdfFont regular = PdfFontFactory.createFont(StandardFonts.HELVETICA);
                        DeviceRgb primaryColor = new DeviceRgb(37, 99, 235);
                        DeviceRgb lightGray = new DeviceRgb(248, 250, 252);
                        DeviceRgb borderColor = new DeviceRgb(226, 232, 240);

                        // ── Header ────────────────────────────────────────────────────────
                        Table header = new Table(UnitValue.createPercentArray(new float[] { 1, 1 }))
                                        .useAllAvailableWidth();

                        Cell logoCell = new Cell().setBorder(Border.NO_BORDER);
                        Paragraph clinicName = new Paragraph("Smart Healthcare")
                                        .setFont(bold).setFontSize(20)
                                        .setFontColor(primaryColor);
                        Paragraph tagline = new Paragraph("Management System")
                                        .setFont(regular).setFontSize(10)
                                        .setFontColor(new DeviceRgb(100, 116, 139));
                        logoCell.add(clinicName).add(tagline);

                        Cell rxCell = new Cell().setBorder(Border.NO_BORDER)
                                        .setTextAlignment(TextAlignment.RIGHT);
                        Paragraph rx = new Paragraph("Rx")
                                        .setFont(bold).setFontSize(42)
                                        .setFontColor(new DeviceRgb(220, 38, 38));
                        rxCell.add(rx);

                        header.addCell(logoCell).addCell(rxCell);
                        document.add(header);

                        // Separator line
                        document.add(new LineSeparator(new SolidLine(2f))
                                        .setMarginTop(5).setMarginBottom(10));

                        // Prescription title + date
                        document.add(new Paragraph("MEDICAL PRESCRIPTION")
                                        .setFont(bold).setFontSize(14)
                                        .setFontColor(primaryColor)
                                        .setTextAlignment(TextAlignment.CENTER)
                                        .setMarginBottom(5));

                        DateTimeFormatter dtf = DateTimeFormatter.ofPattern("dd MMMM yyyy");
                        LocalDateTime createdAt = p.getCreatedAt() != null ? p.getCreatedAt() : LocalDateTime.now();
                        document.add(new Paragraph("Date: " + createdAt.format(dtf) +
                                        "  |  Prescription #" + String.format("RX-%05d", p.getId()))
                                        .setFont(regular).setFontSize(9)
                                        .setFontColor(new DeviceRgb(100, 116, 139))
                                        .setTextAlignment(TextAlignment.CENTER)
                                        .setMarginBottom(12));

                        // ── Doctor & Patient Info ─────────────────────────────────────────
                        Table infoTable = new Table(UnitValue.createPercentArray(new float[] { 1, 1 }))
                                        .useAllAvailableWidth().setMarginBottom(12);

                        // Doctor info
                        Cell docCell = new Cell().setBackgroundColor(lightGray)
                                        .setBorder(new SolidBorder(borderColor, 1)).setPadding(10);
                        docCell.add(new Paragraph("DOCTOR DETAILS").setFont(bold).setFontSize(9)
                                        .setFontColor(primaryColor).setMarginBottom(6));
                        docCell.add(infoRow("Name:", "Dr. " + p.getDoctor().getUser().getName(), bold, regular));
                        docCell.add(infoRow("Specialization:", p.getDoctor().getSpecialization(), bold, regular));
                        if (p.getDoctor().getQualification() != null)
                                docCell.add(infoRow("Qualification:", p.getDoctor().getQualification(), bold, regular));
                        if (p.getDoctor().getHospital() != null)
                                docCell.add(infoRow("Hospital:", p.getDoctor().getHospital(), bold, regular));
                        docCell.add(infoRow("Contact:", p.getDoctor().getUser().getEmail(), bold, regular));

                        // Patient info
                        Cell patCell = new Cell().setBackgroundColor(lightGray)
                                        .setBorder(new SolidBorder(borderColor, 1)).setPadding(10);
                        patCell.add(new Paragraph("PATIENT DETAILS").setFont(bold).setFontSize(9)
                                        .setFontColor(primaryColor).setMarginBottom(6));
                        patCell.add(infoRow("Name:", p.getPatient().getUser().getName(), bold, regular));
                        patCell.add(infoRow("Email:", p.getPatient().getUser().getEmail(), bold, regular));
                        if (p.getPatient().getUser().getPhone() != null)
                                patCell.add(infoRow("Phone:", p.getPatient().getUser().getPhone(), bold, regular));
                        if (p.getPatient().getBloodGroup() != null)
                                patCell.add(infoRow("Blood Group:", p.getPatient().getBloodGroup(), bold, regular));
                        if (p.getPatient().getAllergies() != null)
                                patCell.add(infoRow("Allergies:", p.getPatient().getAllergies(), bold, regular));

                        infoTable.addCell(docCell).addCell(patCell);
                        document.add(infoTable);

                        // ── Diagnosis ─────────────────────────────────────────────────────
                        Cell diagCell = new Cell().setBackgroundColor(new DeviceRgb(254, 243, 199))
                                        .setBorder(new SolidBorder(new DeviceRgb(245, 158, 11), 1))
                                        .setPadding(10).setMarginBottom(12);
                        diagCell.add(new Paragraph("DIAGNOSIS").setFont(bold).setFontSize(10)
                                        .setFontColor(new DeviceRgb(146, 64, 14)).setMarginBottom(4));
                        diagCell.add(new Paragraph(p.getDiagnosis()).setFont(regular).setFontSize(11));
                        // Wrap single cell in 1-col table for block display
                        Table diagWrapper = new Table(UnitValue.createPercentArray(new float[] { 1 }))
                                        .useAllAvailableWidth().setMarginBottom(12);
                        diagWrapper.addCell(diagCell);
                        document.add(diagWrapper);

                        // ── Medicines Table ───────────────────────────────────────────────
                        if (p.getMedicines() != null && !p.getMedicines().isEmpty()) {
                                document.add(new Paragraph("PRESCRIBED MEDICINES")
                                                .setFont(bold).setFontSize(11).setFontColor(primaryColor)
                                                .setMarginTop(12).setMarginBottom(6));

                                Table medTable = new Table(UnitValue.createPercentArray(
                                                new float[] { 3, 1.5f, 2, 1.5f, 2 })).useAllAvailableWidth();

                                // Table headers
                                for (String h : new String[] { "Medicine", "Dosage", "Frequency", "Duration",
                                                "Instructions" }) {
                                        medTable.addHeaderCell(new Cell()
                                                        .setBackgroundColor(primaryColor)
                                                        .add(new Paragraph(h).setFont(bold).setFontSize(9)
                                                                        .setFontColor(ColorConstants.WHITE))
                                                        .setPadding(6));
                                }

                                boolean alt = false;
                                for (PrescriptionMedicine med : p.getMedicines()) {
                                        DeviceRgb rowColor = alt ? lightGray : new DeviceRgb(255, 255, 255);
                                        medTable.addCell(new Cell().setBackgroundColor(rowColor).setPadding(5)
                                                        .add(new Paragraph(med.getMedicineName() +
                                                                        (med.getType() != null
                                                                                        ? "\n(" + med.getType() + ")"
                                                                                        : ""))
                                                                        .setFont(bold).setFontSize(9)));
                                        medTable.addCell(cell(med.getDosage(), regular, rowColor));
                                        medTable.addCell(cell(med.getFrequency(), regular, rowColor));
                                        medTable.addCell(cell(med.getDuration(), regular, rowColor));
                                        medTable.addCell(cell(med.getInstructions(), regular, rowColor));
                                        alt = !alt;
                                }
                                document.add(medTable);
                        }

                        // ── Additional Notes ──────────────────────────────────────────────
                        if (p.getAdditionalNotes() != null && !p.getAdditionalNotes().isBlank()) {
                                document.add(new Paragraph("ADDITIONAL NOTES")
                                                .setFont(bold).setFontSize(10).setFontColor(primaryColor)
                                                .setMarginTop(12));
                                document.add(new Paragraph(p.getAdditionalNotes()).setFont(regular).setFontSize(10));
                        }

                        // ── Follow-up ─────────────────────────────────────────────────────
                        if (p.getFollowUpDate() != null) {
                                document.add(new Paragraph(
                                                "Follow-up Date: " + p.getFollowUpDate().format(dtf))
                                                .setFont(bold).setFontSize(10)
                                                .setFontColor(new DeviceRgb(5, 150, 105)).setMarginTop(10));
                        }

                        // ── Footer ────────────────────────────────────────────────────────
                        document.add(new LineSeparator(new DashedLine())
                                        .setMarginTop(20).setMarginBottom(8));
                        document.add(new Paragraph(
                                        "This is a computer-generated prescription from Smart Healthcare Management System.\n"
                                                        +
                                                        "For queries, contact the doctor directly.")
                                        .setFont(regular).setFontSize(8)
                                        .setFontColor(new DeviceRgb(148, 163, 184))
                                        .setTextAlignment(TextAlignment.CENTER));

                        document.close();
                        return baos.toByteArray();
                } catch (Exception e) {
                        log.error("PDF generation failed: ", e);
                        throw new BadRequestException("Failed to generate prescription PDF");
                }
        }

        // ─── PDF Helpers ──────────────────────────────────────────────────────────

        private Paragraph infoRow(String label, String value, PdfFont bold, PdfFont regular) {
                return new Paragraph()
                                .add(new Text(label + " ").setFont(bold).setFontSize(8)
                                                .setFontColor(new DeviceRgb(71, 85, 105)))
                                .add(new Text(value != null ? value : "-").setFont(regular).setFontSize(9))
                                .setMarginBottom(2);
        }

        private Cell cell(String text, PdfFont font, DeviceRgb bg) {
                return new Cell().setBackgroundColor(bg).setPadding(5)
                                .add(new Paragraph(text != null ? text : "-").setFont(font).setFontSize(9));
        }

        // ─── Mapper ───────────────────────────────────────────────────────────────

        private PrescriptionResponse mapToResponse(Prescription p) {
                List<PrescriptionResponse.MedicineResponse> meds = p.getMedicines() == null ? List.of()
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
