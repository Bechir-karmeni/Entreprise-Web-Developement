package com.dailytracker.nutrition.repository;

import com.dailytracker.nutrition.entity.SavedOnlineRecipe;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SavedOnlineRecipeRepository extends JpaRepository<SavedOnlineRecipe, UUID> {

    List<SavedOnlineRecipe> findByUserIdOrderByNameAsc(UUID userId);

    Optional<SavedOnlineRecipe> findByUserIdAndExternalId(UUID userId, int externalId);

    Optional<SavedOnlineRecipe> findByIdAndUserId(UUID id, UUID userId);
}
