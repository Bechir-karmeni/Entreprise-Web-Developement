package com.dailytracker.nutrition.repository;

import com.dailytracker.nutrition.entity.FoodFavorite;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface FoodFavoriteRepository extends JpaRepository<FoodFavorite, FoodFavorite.Key> {

    List<FoodFavorite> findByUserIdOrderByCreatedAtDesc(UUID userId);
}
