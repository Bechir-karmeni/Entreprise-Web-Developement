package com.dailytracker.nutrition.repository;

import com.dailytracker.nutrition.entity.FridgeItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FridgeItemRepository extends JpaRepository<FridgeItem, UUID> {

    List<FridgeItem> findByUserIdOrderByNameAsc(UUID userId);

    Optional<FridgeItem> findByUserIdAndName(UUID userId, String name);

    Optional<FridgeItem> findByIdAndUserId(UUID id, UUID userId);
}
