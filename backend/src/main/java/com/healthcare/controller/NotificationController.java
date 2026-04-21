package com.healthcare.controller;
import com.healthcare.dto.response.*;
import com.healthcare.entity.Notification;
import com.healthcare.repository.UserRepository;
import com.healthcare.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController @RequestMapping("/api/notifications") @RequiredArgsConstructor
public class NotificationController {
    private final NotificationService notificationService;
    private final UserRepository userRepo;

    @GetMapping
    public ResponseEntity<ApiResponse<List<NotificationResponse>>> getAll(@AuthenticationPrincipal UserDetails ud) {
        List<NotificationResponse> list = notificationService.getUserNotifications(uid(ud))
                .stream().map(n -> NotificationResponse.builder().id(n.getId()).title(n.getTitle())
                        .message(n.getMessage()).type(n.getType()).isRead(n.getIsRead())
                        .referenceId(n.getReferenceId()).createdAt(n.getCreatedAt()).build()).toList();
        return ResponseEntity.ok(ApiResponse.success(list));
    }
    @GetMapping("/unread-count")
    public ResponseEntity<ApiResponse<Map<String,Long>>> unread(@AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(ApiResponse.success(Map.of("count", notificationService.getUnreadCount(uid(ud)))));
    }
    @PatchMapping("/mark-all-read")
    public ResponseEntity<ApiResponse<Void>> markAll(@AuthenticationPrincipal UserDetails ud) {
        notificationService.markAllAsRead(uid(ud));
        return ResponseEntity.ok(ApiResponse.success(null, "All read"));
    }
    @PatchMapping("/{id}/read")
    public ResponseEntity<ApiResponse<Void>> markOne(@PathVariable Long id, @AuthenticationPrincipal UserDetails ud) {
        notificationService.markAsRead(id, uid(ud));
        return ResponseEntity.ok(ApiResponse.success(null, "Marked read"));
    }
    private Long uid(UserDetails ud) { return userRepo.findByEmail(ud.getUsername()).orElseThrow().getId(); }
}
