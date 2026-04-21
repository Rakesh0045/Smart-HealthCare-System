package com.healthcare.service;

import com.healthcare.entity.AuditLog;
import com.healthcare.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuditLogService {

    private final AuditLogRepository auditLogRepo;

    @Async
    public void log(Long userId, String action, String entityType, Long entityId, String details) {
        AuditLog log = AuditLog.builder()
                .userId(userId).action(action)
                .entityType(entityType).entityId(entityId)
                .details(details).build();
        auditLogRepo.save(log);
    }

    public Page<AuditLog> getAll(Pageable pageable) {
        return auditLogRepo.findAllByOrderByCreatedAtDesc(pageable);
    }

    public Page<AuditLog> getByUser(Long userId, Pageable pageable) {
        return auditLogRepo.findByUserIdOrderByCreatedAtDesc(userId, pageable);
    }
}
