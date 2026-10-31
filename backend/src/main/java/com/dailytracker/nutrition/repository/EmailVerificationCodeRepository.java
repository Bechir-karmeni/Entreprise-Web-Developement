package com.dailytracker.nutrition.repository;

import com.dailytracker.nutrition.entity.EmailVerificationCode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

public interface EmailVerificationCodeRepository extends JpaRepository<EmailVerificationCode, UUID> {

    Optional<EmailVerificationCode> findFirstByUserIdOrderByCreatedAtDesc(UUID userId);

    @Transactional
    void deleteByUserId(UUID userId);
}
