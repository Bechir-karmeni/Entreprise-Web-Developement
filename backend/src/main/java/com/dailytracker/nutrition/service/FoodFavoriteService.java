package com.dailytracker.nutrition.service;

import com.dailytracker.nutrition.dto.FoodResponse;
import com.dailytracker.nutrition.entity.Food;
import com.dailytracker.nutrition.entity.FoodFavorite;
import com.dailytracker.nutrition.exception.ResourceNotFoundException;
import com.dailytracker.nutrition.repository.FoodFavoriteRepository;
import com.dailytracker.nutrition.repository.FoodRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class FoodFavoriteService {

    private final FoodFavoriteRepository favorites;
    private final FoodRepository foods;

    public FoodFavoriteService(FoodFavoriteRepository favorites, FoodRepository foods) {
        this.favorites = favorites;
        this.foods = foods;
    }

    /** The user's favourite foods, most recently starred first. */
    @Transactional(readOnly = true)
    public List<FoodResponse> list(UUID userId) {
        List<UUID> ids = favorites.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(FoodFavorite::getFoodId)
                .toList();
        Map<UUID, Food> byId = foods.findAllById(ids).stream()
                .collect(Collectors.toMap(Food::getId, Function.identity()));
        return ids.stream()
                .map(byId::get)
                .filter(Objects::nonNull)
                .map(FoodResponse::from)
                .toList();
    }

    /** Stars a food. Starring it twice does nothing. */
    @Transactional
    public void add(UUID userId, UUID foodId) {
        Food food = foods.findById(foodId)
                .filter(candidate -> candidate.isVisibleTo(userId))
                .orElseThrow(() -> new ResourceNotFoundException("Food not found."));
        FoodFavorite.Key key = new FoodFavorite.Key(userId, food.getId());
        if (!favorites.existsById(key)) {
            favorites.save(new FoodFavorite(userId, food.getId()));
        }
    }

    /** Removes a star. Removing a food that is not starred does nothing. */
    @Transactional
    public void remove(UUID userId, UUID foodId) {
        favorites.findById(new FoodFavorite.Key(userId, foodId)).ifPresent(favorites::delete);
    }
}
