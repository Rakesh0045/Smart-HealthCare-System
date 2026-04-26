package com.healthcare.service;

import com.healthcare.dto.request.PaymentVerifyRequest;
import com.healthcare.entity.Appointment;
import com.healthcare.entity.Payment;
import com.healthcare.enums.PaymentStatus;
import com.healthcare.exception.*;
import com.healthcare.repository.*;
import com.razorpay.Order;
import com.razorpay.RazorpayClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentService {

    private final PaymentRepository paymentRepo;
    private final AppointmentRepository appointmentRepo;
    private final NotificationService notificationService;

    @Value("${app.razorpay.key-id}")
    private String keyId;
    @Value("${app.razorpay.key-secret}")
    private String keySecret;

    @Transactional
    public Map<String, String> createOrder(Long appointmentId, Long userId) {
        Appointment appointment = appointmentRepo.findById(appointmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Appointment", appointmentId));
        if (!appointment.getPatient().getUser().getId().equals(userId)) {
            throw new BadRequestException("You can only pay for your own appointments.");
        }
        if (appointment.getPaymentStatus() == PaymentStatus.PAID
                || paymentRepo.findByAppointmentId(appointmentId)
                        .map(payment -> payment.getStatus() == PaymentStatus.PAID)
                        .orElse(false)) {
            Map<String, String> result = new HashMap<>();
            result.put("status", "ALREADY_PAID");
            result.put("message", "Appointment already paid");
            return result;
        }
        try {
            if (keyId == null || keySecret == null || keyId.contains("your_key")
                    || keySecret.contains("your_razorpay")) {
                throw new BadRequestException(
                        "Razorpay keys are not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.");
            }

            RazorpayClient client = new RazorpayClient(keyId, keySecret);
            JSONObject options = new JSONObject();
            options.put("amount", (int) (appointment.getDoctor().getConsultationFee() * 100));
            options.put("currency", "INR");
            options.put("receipt", "receipt_appt_" + appointmentId);
            Order order = client.orders.create(options);

            Payment payment = Payment.builder()
                    .appointment(appointment)
                    .amount(appointment.getDoctor().getConsultationFee())
                    .razorpayOrderId(order.get("id"))
                    .currency("INR").status(PaymentStatus.PENDING).build();
            paymentRepo.save(payment);

            return Map.of(
                    "orderId", order.get("id").toString(),
                    "amount", String.valueOf((int) (appointment.getDoctor().getConsultationFee() * 100)),
                    "currency", "INR",
                    "keyId", keyId);
        } catch (BadRequestException e) {
            throw e;
        } catch (Exception e) {
            log.error("Razorpay order creation failed for key {}: {}", maskKey(keyId), e.getMessage());
            throw new BadRequestException("Payment initialization failed. Verify Razorpay Key ID/Secret pair.");
        }
    }

    @Transactional
    public void verifyPayment(PaymentVerifyRequest req, Long userId) {
        try {
            String generated = hmacSHA256(req.getRazorpayOrderId() + "|" + req.getRazorpayPaymentId(), keySecret);
            if (!generated.equals(req.getRazorpaySignature()))
                throw new BadRequestException("Payment verification failed - invalid signature");

            Payment payment = paymentRepo.findByRazorpayOrderId(req.getRazorpayOrderId())
                    .orElseThrow(() -> new ResourceNotFoundException("Payment not found"));
            if (!payment.getAppointment().getPatient().getUser().getId().equals(userId)) {
                throw new BadRequestException("You can only verify your own appointment payments.");
            }
            payment.setRazorpayPaymentId(req.getRazorpayPaymentId());
            payment.setRazorpaySignature(req.getRazorpaySignature());
            payment.setStatus(PaymentStatus.PAID);
            paymentRepo.save(payment);

            Appointment appointment = payment.getAppointment();
            appointment.setPaymentStatus(com.healthcare.enums.PaymentStatus.PAID);
            appointmentRepo.save(appointment);

            notificationService.sendPaymentConfirmation(
                    appointment.getPatient().getUser(), payment.getAmount());
        } catch (BadRequestException e) {
            throw e;
        } catch (Exception e) {
            throw new BadRequestException("Payment verification error: " + e.getMessage());
        }
    }

    private String hmacSHA256(String data, String secret) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(secret.getBytes(), "HmacSHA256"));
        byte[] hash = mac.doFinal(data.getBytes());
        StringBuilder hex = new StringBuilder();
        for (byte b : hash)
            hex.append(String.format("%02x", b));
        return hex.toString();
    }

    private String maskKey(String key) {
        if (key == null || key.length() < 8)
            return "<unset>";
        return key.substring(0, 4) + "****" + key.substring(key.length() - 4);
    }
}
