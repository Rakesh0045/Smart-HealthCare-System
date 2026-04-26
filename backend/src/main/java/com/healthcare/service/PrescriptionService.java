package com.healthcare.service;

import com.healthcare.dto.request.PrescriptionRequest;
import com.healthcare.dto.request.DoseCompletionRequest;
import com.healthcare.dto.response.MedicationReminderResponse;
import com.healthcare.dto.response.PrescriptionResponse;
import com.healthcare.entity.*;
import com.healthcare.exception.*;
import com.healthcare.repository.*;
import com.itextpdf.io.font.constants.StandardFonts;
import com.itextpdf.kernel.colors.Color;
import com.itextpdf.kernel.colors.ColorConstants;
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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
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

        // ─── Brand colors ─────────────────────────────────────────────────────────
        private static final DeviceRgb TEAL = new DeviceRgb(13, 148, 136);
        private static final DeviceRgb TEAL_LIGHT = new DeviceRgb(240, 253, 250);
        private static final DeviceRgb TEAL_MID = new DeviceRgb(204, 251, 241);
        private static final DeviceRgb RED_HEART = new DeviceRgb(239, 68, 68);
        private static final DeviceRgb DARK = new DeviceRgb(15, 23, 42);
        private static final DeviceRgb SLATE = new DeviceRgb(71, 85, 105);
        private static final DeviceRgb LIGHT_BG = new DeviceRgb(248, 250, 252);
        private static final DeviceRgb BORDER_COLOR = new DeviceRgb(226, 232, 240);
        private static final DeviceRgb AMBER_BG = new DeviceRgb(255, 251, 235);
        private static final DeviceRgb AMBER_BORDER = new DeviceRgb(253, 230, 138);
        private static final DeviceRgb AMBER_TXT = new DeviceRgb(146, 64, 14);
        private static final DeviceRgb PURPLE = new DeviceRgb(124, 58, 237);
        private static final DeviceRgb PURPLE_BG = new DeviceRgb(245, 243, 255);
        private static final DeviceRgb PURPLE_MID = new DeviceRgb(221, 214, 254);
        private static final DeviceRgb BLUE_INFO = new DeviceRgb(29, 78, 216);
        private static final String[] DOSE_TIME_LABELS = { "8:00 AM", "1:00 PM", "8:00 PM", "10:00 PM" };

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
                notificationService.sendPrescriptionNotification(
                                appointment.getPatient().getUser(), appointment.getDoctor().getUser().getName());
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
                        if (!Boolean.TRUE.equals(prescription.getIsActive()) || prescription.getCreatedAt() == null) {
                                continue;
                        }

                        LocalDate prescriptionDate = prescription.getCreatedAt().toLocalDate();

                        for (PrescriptionMedicine medicine : prescription.getMedicines() == null
                                        ? List.<PrescriptionMedicine>of()
                                        : prescription.getMedicines()) {
                                int prescribedDays = parsePrescribedDays(medicine.getDuration());
                                LocalDate prescribedEndDate = prescriptionDate
                                                .plusDays(Math.max(1, prescribedDays) - 1L);

                                if (date.isBefore(prescriptionDate) || date.isAfter(prescribedEndDate)) {
                                        continue;
                                }

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
                                .date(date)
                                .totalSlots(slots.size())
                                .completedSlots(completedSlots)
                                .slots(slots)
                                .build();
        }

        @Transactional
        public MedicationReminderResponse updateDoseCompletion(Long userId, DoseCompletionRequest request) {
                Patient patient = patientRepo.findByUserId(userId)
                                .orElseThrow(() -> new ResourceNotFoundException("Patient profile not found"));

                PrescriptionMedicine medicine = prescriptionMedicineRepo.findById(request.getPrescriptionMedicineId())
                                .orElseThrow(() -> new ResourceNotFoundException("Prescription medicine",
                                                request.getPrescriptionMedicineId()));

                if (!medicine.getPrescription().getPatient().getId().equals(patient.getId())) {
                        throw new BadRequestException("You can only update your own medication reminders.");
                }

                LocalDate doseDate = request.getDoseDate() != null ? request.getDoseDate() : LocalDate.now();

                MedicationDoseLog existing = medicationDoseLogRepo
                                .findByPatientIdAndPrescriptionMedicineIdAndDoseDateAndSlotIndex(
                                                patient.getId(),
                                                medicine.getId(),
                                                doseDate,
                                                request.getSlotIndex())
                                .orElse(null);

                if (Boolean.TRUE.equals(request.getTaken())) {
                        MedicationDoseLog toSave = existing == null ? MedicationDoseLog.builder()
                                        .patient(patient)
                                        .prescriptionMedicine(medicine)
                                        .doseDate(doseDate)
                                        .slotIndex(request.getSlotIndex())
                                        .build() : existing;

                        toSave.setTaken(true);
                        toSave.setTakenAt(LocalDateTime.now());
                        medicationDoseLogRepo.save(toSave);
                } else if (existing != null) {
                        medicationDoseLogRepo.delete(existing);
                }

                return getPatientMedicationReminder(userId, doseDate);
        }

        // ─── PDF Generation (MediCare Branded) ───────────────────────────────────

        @Transactional(readOnly = true)
        public byte[] generatePrescriptionPdf(Long prescriptionId) {
                Prescription p = prescriptionRepo.findById(prescriptionId)
                                .orElseThrow(() -> new ResourceNotFoundException("Prescription", prescriptionId));

                try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
                        PdfWriter writer = new PdfWriter(baos);
                        PdfDocument pdfDoc = new PdfDocument(writer);
                        Document document = new Document(pdfDoc, PageSize.A4);
                        document.setMargins(20, 20, 28, 20);

                        PdfFont bold = PdfFontFactory.createFont(StandardFonts.HELVETICA_BOLD);
                        PdfFont regular = PdfFontFactory.createFont(StandardFonts.HELVETICA);

                        // Draw page border + footer on every page
                        drawPageDecoration(pdfDoc, document, regular);

                        // ── HEADER ────────────────────────────────────────────────────────
                        Table header = new Table(UnitValue.createPercentArray(new float[] { 8, 74, 18 }))
                                        .useAllAvailableWidth().setMarginBottom(6);

                        // Logo cell (stethoscope + heart drawn via SVG-like iText)
                        Cell logoCell = new Cell().setBorder(Border.NO_BORDER)
                                        .setVerticalAlignment(VerticalAlignment.MIDDLE);
                        logoCell.add(buildLogoImage(bold, regular));
                        header.addCell(logoCell);

                        // Clinic info
                        Cell clinicCell = new Cell().setBorder(Border.NO_BORDER)
                                        .setVerticalAlignment(VerticalAlignment.MIDDLE).setPaddingLeft(10);
                        clinicCell.add(new Paragraph("MediCare").setFont(bold).setFontSize(22)
                                        .setFontColor(TEAL).setMarginBottom(1));
                        clinicCell.add(new Paragraph("Smart Healthcare Management System").setFont(regular)
                                        .setFontSize(8.5f).setFontColor(SLATE).setMarginBottom(4));
                        String docName = "Dr. " + p.getDoctor().getUser().getName();
                        String spec = p.getDoctor().getSpecialization() != null ? p.getDoctor().getSpecialization()
                                        : "";
                        clinicCell.add(new Paragraph(docName + "  •  " + spec).setFont(bold)
                                        .setFontSize(10).setFontColor(DARK).setMarginBottom(1));
                        String hospital = p.getDoctor().getHospital() != null ? p.getDoctor().getHospital() + "  •  "
                                        : "";
                        clinicCell.add(new Paragraph(hospital + p.getDoctor().getUser().getEmail()).setFont(regular)
                                        .setFontSize(8).setFontColor(SLATE));
                        header.addCell(clinicCell);

                        // Rx symbol
                        Cell rxCell = new Cell().setBorder(Border.NO_BORDER)
                                        .setTextAlignment(TextAlignment.RIGHT)
                                        .setVerticalAlignment(VerticalAlignment.MIDDLE);
                        rxCell.add(new Paragraph("℞").setFont(bold).setFontSize(56)
                                        .setFontColor(RED_HEART).setTextAlignment(TextAlignment.RIGHT));
                        header.addCell(rxCell);
                        document.add(header);

                        // Divider
                        document.add(new LineSeparator(new SolidLine(2f)).setMarginBottom(6)
                                        .setStrokeColor(TEAL));

                        // Title + meta
                        DateTimeFormatter dtf = DateTimeFormatter.ofPattern("dd MMMM yyyy");
                        LocalDateTime createdAt = p.getCreatedAt() != null ? p.getCreatedAt() : LocalDateTime.now();

                        document.add(new Paragraph("MEDICAL PRESCRIPTION").setFont(bold).setFontSize(13)
                                        .setFontColor(TEAL).setTextAlignment(TextAlignment.CENTER).setMarginBottom(3));
                        document.add(new Paragraph(
                                        "Date: " + createdAt.format(dtf) + "   |   Prescription #" +
                                                        String.format("RX-%05d", p.getId()) + "   |   Reg: MC-"
                                                        + createdAt.getYear() + "-" + String.format("%03d", p.getId()))
                                        .setFont(regular).setFontSize(8).setFontColor(SLATE)
                                        .setTextAlignment(TextAlignment.CENTER).setMarginBottom(10));

                        // ── DOCTOR / PATIENT INFO ─────────────────────────────────────────
                        Table infoTable = new Table(UnitValue.createPercentArray(new float[] { 50, 50 }))
                                        .useAllAvailableWidth().setMarginBottom(10);

                        // Doctor block
                        Cell docCell = buildInfoCell(bold, regular,
                                        "DOCTOR DETAILS", TEAL, TEAL_LIGHT, TEAL_MID,
                                        new String[][] {
                                                        { "Name:", docName },
                                                        { "Specialization:", spec.isEmpty() ? "-" : spec },
                                                        { "Qualification:", nvl(p.getDoctor().getQualification()) },
                                                        { "Hospital:", nvl(p.getDoctor().getHospital()) },
                                                        { "Email:", p.getDoctor().getUser().getEmail() },
                                                        { "Phone:", nvl(p.getDoctor().getUser().getPhone()) },
                                        });
                        infoTable.addCell(docCell);

                        // Patient block
                        Cell patCell = buildInfoCell(bold, regular,
                                        "PATIENT DETAILS", BLUE_INFO, LIGHT_BG, BORDER_COLOR,
                                        new String[][] {
                                                        { "Name:", p.getPatient().getUser().getName() },
                                                        { "Email:", p.getPatient().getUser().getEmail() },
                                                        { "Phone:", nvl(p.getPatient().getUser().getPhone()) },
                                                        { "Blood Group:", nvl(p.getPatient().getBloodGroup()) },
                                                        { "Allergies:", nvl(p.getPatient().getAllergies()) },
                                        });
                        infoTable.addCell(patCell);
                        document.add(infoTable);

                        // ── DIAGNOSIS ─────────────────────────────────────────────────────
                        Table diagTable = new Table(UnitValue.createPercentArray(new float[] { 100 }))
                                        .useAllAvailableWidth().setMarginBottom(12);
                        Cell diagCell = new Cell()
                                        .setBackgroundColor(AMBER_BG)
                                        .setBorder(new SolidBorder(AMBER_BORDER, 1))
                                        .setPadding(12);
                        diagCell.add(new Paragraph("DIAGNOSIS").setFont(bold).setFontSize(8)
                                        .setFontColor(AMBER_TXT).setMarginBottom(4));
                        diagCell.add(new Paragraph(p.getDiagnosis()).setFont(bold).setFontSize(11.5f)
                                        .setFontColor(DARK).setFixedLeading(16f));
                        diagTable.addCell(diagCell);
                        document.add(diagTable);

                        // ── MEDICINES ─────────────────────────────────────────────────────
                        if (p.getMedicines() != null && !p.getMedicines().isEmpty()) {
                                document.add(new Paragraph("PRESCRIBED MEDICINES").setFont(bold).setFontSize(8.5f)
                                                .setFontColor(TEAL).setMarginBottom(5));

                                float[] colW = { 135, 52, 90, 62, 121 };
                                Table medTable = new Table(UnitValue.createPointArray(colW)).useAllAvailableWidth();

                                // Header row
                                for (String h : new String[] { "Medicine / Type", "Dosage", "Frequency", "Duration",
                                                "Instructions" }) {
                                        Cell hc = new Cell().setBackgroundColor(TEAL)
                                                        .setBorder(new SolidBorder(TEAL_MID, 0.3f)).setPadding(8);
                                        hc.add(new Paragraph(h).setFont(bold).setFontSize(8)
                                                        .setFontColor(ColorConstants.WHITE)
                                                        .setTextAlignment(
                                                                        h.equals("Medicine / Type") ? TextAlignment.LEFT
                                                                                        : TextAlignment.CENTER));
                                        medTable.addHeaderCell(hc);
                                }

                                boolean alt = false;
                                for (PrescriptionMedicine med : p.getMedicines()) {
                                        Color rowBg = alt ? TEAL_LIGHT : ColorConstants.WHITE;

                                        // Name + type cell
                                        Cell nameCell = new Cell().setBackgroundColor(rowBg)
                                                        .setBorder(new SolidBorder(TEAL_MID, 0.3f)).setPadding(8);
                                        nameCell.add(new Paragraph(med.getMedicineName()).setFont(bold).setFontSize(9)
                                                        .setFontColor(DARK).setMarginBottom(1));
                                        if (med.getType() != null)
                                                nameCell.add(new Paragraph("(" + med.getType() + ")").setFont(regular)
                                                                .setFontSize(7.5f).setFontColor(TEAL));
                                        medTable.addCell(nameCell);

                                        medTable.addCell(medCell(nvl(med.getDosage()), regular, rowBg,
                                                        TextAlignment.CENTER));
                                        medTable.addCell(medCell(nvl(med.getFrequency()), regular, rowBg,
                                                        TextAlignment.CENTER));
                                        medTable.addCell(medCell(nvl(med.getDuration()), regular, rowBg,
                                                        TextAlignment.CENTER));
                                        medTable.addCell(medCell(nvl(med.getInstructions()), regular, rowBg,
                                                        TextAlignment.LEFT));
                                        alt = !alt;
                                }
                                document.add(medTable);
                        }

                        document.add(new Paragraph().setMarginTop(12));

                        // ── NOTES + FOLLOW-UP ─────────────────────────────────────────────
                        Table bottomRow = new Table(UnitValue.createPercentArray(new float[] { 60, 40 }))
                                        .useAllAvailableWidth().setMarginBottom(16);

                        // Notes cell
                        Cell notesCell = new Cell().setBackgroundColor(LIGHT_BG)
                                        .setBorder(new SolidBorder(BORDER_COLOR, 0.5f)).setPadding(12);
                        notesCell.add(new Paragraph("ADDITIONAL NOTES").setFont(bold).setFontSize(8)
                                        .setFontColor(TEAL).setMarginBottom(4));
                        String notes = p.getAdditionalNotes() != null && !p.getAdditionalNotes().isBlank()
                                        ? p.getAdditionalNotes()
                                        : "No additional notes.";
                        notesCell.add(new Paragraph(notes).setFont(regular).setFontSize(9)
                                        .setFontColor(DARK).setFixedLeading(13f));
                        bottomRow.addCell(notesCell);

                        // Follow-up cell
                        Cell fuCell = new Cell().setBackgroundColor(PURPLE_BG)
                                        .setBorder(new SolidBorder(PURPLE_MID, 0.5f)).setPadding(12);
                        fuCell.add(new Paragraph("FOLLOW-UP DATE").setFont(bold).setFontSize(8)
                                        .setFontColor(PURPLE).setMarginBottom(4));
                        if (p.getFollowUpDate() != null) {
                                fuCell.add(new Paragraph(p.getFollowUpDate().format(dtf)).setFont(bold)
                                                .setFontSize(14).setFontColor(PURPLE).setMarginBottom(4)
                                                .setFixedLeading(18f));
                                fuCell.add(new Paragraph("Please bring all reports and medication records.")
                                                .setFont(regular)
                                                .setFontSize(8).setFontColor(SLATE).setFixedLeading(11f));
                        } else {
                                fuCell.add(new Paragraph("As required").setFont(bold).setFontSize(13)
                                                .setFontColor(PURPLE).setFixedLeading(18f));
                        }
                        bottomRow.addCell(fuCell);
                        document.add(bottomRow);

                        // ── SIGNATURES ────────────────────────────────────────────────────
                        Table sigTable = new Table(UnitValue.createPercentArray(new float[] { 45, 10, 45 }))
                                        .useAllAvailableWidth();

                        sigTable.addCell(sigCell(bold, regular, "Patient / Guardian Acknowledgement",
                                        "Patient Signature", SLATE));
                        sigTable.addCell(new Cell().setBorder(Border.NO_BORDER));
                        sigTable.addCell(sigCell(bold, regular, "Doctor's Signature & Stamp",
                                        docName + "  •  " + spec, TEAL));
                        document.add(sigTable);

                        document.close();
                        return baos.toByteArray();

                } catch (Exception e) {
                        log.error("PDF generation failed: ", e);
                        throw new BadRequestException("Failed to generate prescription PDF");
                }
        }

        // ─── Logo image (teal box with stethoscope text approximation) ───────────
        private Table buildLogoImage(PdfFont bold, PdfFont regular) {
                // Clear, more legible logo: larger stethoscope glyph with clinic label
                Table t = new Table(UnitValue.createPointArray(new float[] { 64 }));
                Cell c = new Cell().setHeight(64)
                                .setBackgroundColor(TEAL)
                                .setBorderRadius(new BorderRadius(10))
                                .setBorder(Border.NO_BORDER)
                                .setVerticalAlignment(VerticalAlignment.MIDDLE)
                                .setTextAlignment(TextAlignment.CENTER)
                                .setPadding(6);

                // Large stethoscope glyph for clarity
                c.add(new Paragraph("⚕").setFont(bold).setFontSize(30f)
                                .setFontColor(ColorConstants.WHITE).setMarginBottom(2));

                // Small clinic initials for branding (contrasting white)
                c.add(new Paragraph("MediCare").setFont(bold).setFontSize(9f)
                                .setFontColor(ColorConstants.WHITE).setMarginTop(0));

                t.addCell(c);
                t.setWidth(64);
                return t;
        }

        // ─── Page decoration (border + footer) ────────────────────────────────────
        private void drawPageDecoration(PdfDocument pdfDoc, Document document, PdfFont regular) {
                pdfDoc.addEventHandler(PdfDocumentEvent.END_PAGE, event -> {
                        PdfDocumentEvent docEvent = (PdfDocumentEvent) event;
                        PdfDocument pdf = docEvent.getDocument();
                        PdfPage page = docEvent.getPage();
                        PdfCanvas canvas = new PdfCanvas(page);
                        try {
                                PageSize ps = pdf.getDefaultPageSize();
                                float w = ps.getWidth(), h = ps.getHeight();
                                float m = 11;

                                // Outer teal border
                                canvas.setStrokeColor(TEAL).setLineWidth(2.5f)
                                                .rectangle(m, m, w - 2 * m, h - 2 * m).stroke();
                                // Inner thin border
                                canvas.setStrokeColor(TEAL_MID).setLineWidth(0.4f)
                                                .rectangle(m + 2.5f, m + 2.5f, w - 2 * (m + 2.5f), h - 2 * (m + 2.5f))
                                                .stroke();

                                // Footer bar
                                canvas.setFillColor(TEAL)
                                                .rectangle(m, m, w - 2 * m, 9.5f).fill();
                                canvas.setFillColor(ColorConstants.WHITE)
                                                .setFontAndSize(regular, 6.8f)
                                                .beginText()
                                                .moveText(w / 2 - 170, m + 3.5f)
                                                .showText("MediCare Smart Healthcare  •  Computer-generated prescription  •  Contact the doctor for queries")
                                                .endText();
                        } catch (Exception ex) {
                                log.warn("Page decoration error: {}", ex.getMessage());
                        } finally {
                                canvas.release();
                        }
                });
        }

        // ─── Helper: info block cell ──────────────────────────────────────────────
        private Cell buildInfoCell(PdfFont bold, PdfFont regular,
                        String heading, DeviceRgb headColor,
                        DeviceRgb bgColor, DeviceRgb borderCol,
                        String[][] rows) {
                Cell cell = new Cell().setBackgroundColor(bgColor)
                                .setBorder(new SolidBorder(borderCol, 0.5f)).setPadding(12);
                cell.add(new Paragraph(heading).setFont(bold).setFontSize(8)
                                .setFontColor(headColor).setMarginBottom(6));
                for (String[] row : rows) {
                        Table rt = new Table(UnitValue.createPercentArray(new float[] { 35, 65 }))
                                        .useAllAvailableWidth();
                        rt.addCell(new Cell().setBorder(Border.NO_BORDER).setPadding(1.5f)
                                        .add(new Paragraph(row[0]).setFont(bold).setFontSize(8).setFontColor(SLATE)));
                        rt.addCell(new Cell().setBorder(Border.NO_BORDER).setPadding(1.5f)
                                        .add(new Paragraph(row[1]).setFont(regular).setFontSize(9).setFontColor(DARK)));
                        cell.add(rt);
                }
                return cell;
        }

        // ─── Helper: medicine table cell ──────────────────────────────────────────
        private Cell medCell(String text, PdfFont font, Color bg, TextAlignment align) {
                return new Cell().setBackgroundColor(bg)
                                .setBorder(new SolidBorder(TEAL_MID, 0.3f)).setPadding(8)
                                .add(new Paragraph(text).setFont(font).setFontSize(9)
                                                .setFontColor(DARK).setTextAlignment(align));
        }

        // ─── Helper: signature cell ────────────────────────────────────────────────
        private Cell sigCell(PdfFont bold, PdfFont regular, String label, String name, DeviceRgb col) {
                Cell cell = new Cell().setBorder(Border.NO_BORDER);
                cell.add(new Paragraph(label).setFont(regular).setFontSize(8).setFontColor(SLATE).setMarginBottom(22));
                cell.add(new LineSeparator(new SolidLine(0.6f)).setStrokeColor(col));
                cell.add(new Paragraph(name).setFont(bold).setFontSize(8).setFontColor(col)
                                .setTextAlignment(TextAlignment.CENTER));
                return cell;
        }

        // ─── Helper: null-safe value ───────────────────────────────────────────────
        private String nvl(String v) {
                return v != null && !v.isBlank() ? v : "-";
        }

        private int getDoseCount(String frequency) {
                String text = frequency == null ? "" : frequency.toLowerCase();
                if (text.matches(".*(three|thrice|3\\s*x|tid).*")) {
                        return 3;
                }
                if (text.matches(".*(twice|2\\s*x|bid).*")) {
                        return 2;
                }
                if (text.matches(".*(four|4\\s*x|qid).*")) {
                        return 4;
                }
                return 1;
        }

        private int parsePrescribedDays(String duration) {
                if (duration == null || duration.isBlank()) {
                        return 1;
                }

                Matcher matcher = Pattern.compile("(\\d+)").matcher(duration);
                if (matcher.find()) {
                        return Math.max(1, Integer.parseInt(matcher.group(1)));
                }

                String text = duration.toLowerCase();
                if (text.contains("week")) {
                        return 7;
                }
                if (text.contains("month")) {
                        return 30;
                }
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
                                .hospitalName(p.getDoctor().getHospital())
                                .patientName(p.getPatient().getUser().getName())
                                .patientEmail(p.getPatient().getUser().getEmail())
                                .diagnosis(p.getDiagnosis()).medicines(meds)
                                .additionalNotes(p.getAdditionalNotes()).followUpDate(p.getFollowUpDate())
                                .createdAt(p.getCreatedAt()).build();
        }
}