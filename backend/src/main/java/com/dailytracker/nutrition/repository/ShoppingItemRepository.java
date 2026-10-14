package com.dailytracker.nutrition.repository;

import com.dailytracker.nutrition.entity.ShoppingItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ShoppingItemRepository extends JpaRepository<ShoppingItem, UUID> {

    List<ShoppingItem> findByUserIdOrderByCreatedAtAsc(UUID userId);

    /** Only returns the item if it belongs to this user. */
    Optional<ShoppingItem> findByIdAndUserId(UUID id, UUID userId);
}
