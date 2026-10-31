package com.dailytracker.nutrition.repository;

import com.dailytracker.nutrition.entity.WaterIntakeEntry;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface WaterIntakeRepository extends JpaRepository<WaterIntakeEntry, UUID> {

    List<WaterIntakeEntry> findByUserIdAndLogDateOrderByCreatedAtAsc(UUID userId, LocalDate logDate);

    List<WaterIntakeEntry> findByUserIdAndLogDateBetweenOrderByLogDateAsc(UUID userId, LocalDate from, LocalDate to);

    /** Only returns the entry if it belongs to this user. */
    Optional<WaterIntakeEntry> findByIdAndUserId(UUID id, UUID userId);
}
