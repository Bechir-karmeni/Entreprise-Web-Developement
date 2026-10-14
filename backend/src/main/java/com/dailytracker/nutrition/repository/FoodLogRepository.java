package com.dailytracker.nutrition.repository;

import com.dailytracker.nutrition.entity.FoodLogEntry;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FoodLogRepository extends JpaRepository<FoodLogEntry, UUID> {

    List<FoodLogEntry> findByUserIdAndLogDateOrderByCreatedAtAsc(UUID userId, LocalDate logDate);

    /** Only returns the entry if it belongs to this user, so users cannot delete each other's entries. */
    Optional<FoodLogEntry> findByIdAndUserId(UUID id, UUID userId);
}
