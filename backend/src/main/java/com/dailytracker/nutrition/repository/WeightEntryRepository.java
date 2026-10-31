package com.dailytracker.nutrition.repository;

import com.dailytracker.nutrition.entity.WeightEntry;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface WeightEntryRepository extends JpaRepository<WeightEntry, UUID> {

    List<WeightEntry> findByUserIdAndLogDateBetweenOrderByLogDateAsc(UUID userId, LocalDate from, LocalDate to);

    Optional<WeightEntry> findByUserIdAndLogDate(UUID userId, LocalDate logDate);

    /** Only returns the entry if it belongs to this user. */
    Optional<WeightEntry> findByIdAndUserId(UUID id, UUID userId);
}
