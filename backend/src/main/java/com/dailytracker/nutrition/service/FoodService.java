package com.dailytracker.nutrition.service;

import com.dailytracker.nutrition.dto.CustomFoodRequest;
import com.dailytracker.nutrition.dto.FoodResponse;
import com.dailytracker.nutrition.dto.PageResponse;
import com.dailytracker.nutrition.entity.Food;
import com.dailytracker.nutrition.exception.InvalidRequestException;
import com.dailytracker.nutrition.exception.ResourceNotFoundException;
import com.dailytracker.nutrition.food.FoodCategory;
import com.dailytracker.nutrition.food.FoodScope;
import com.dailytracker.nutrition.repository.FoodRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.UUID;

@Service
public class FoodService {

    static final int MAX_PAGE_SIZE = 50;
    static final int MAX_QUERY_LENGTH = 100;

    private final FoodRepository foods;

    public FoodService(FoodRepository foods) {
        this.foods = foods;
    }

    /**
     * Searches foods by name. COMMON returns shared foods; CUSTOM returns the user's own foods.
     * The page size is limited to 50 so one request cannot load the whole table.
     */
    @Transactional(readOnly = true)
    public PageResponse<FoodResponse> search(UUID userId, String query, FoodScope scope, int page, int size) {
        String text = query == null ? "" : query.trim();
        if (text.length() > MAX_QUERY_LENGTH) {
            throw new InvalidRequestException("Search text must be at most 100 characters.");
        }
        int safePage = Math.max(0, page);
        int safeSize = Math.min(Math.max(1, size), MAX_PAGE_SIZE);
        Pageable pageable = PageRequest.of(safePage, safeSize, Sort.by("name"));
        Page<Food> result = scope == FoodScope.CUSTOM
                ? foods.findCustom(userId, text, pageable)
                : foods.findCommon(text, pageable);
        return PageResponse.of(result.map(FoodResponse::from));
    }

    @Transactional(readOnly = true)
    public FoodResponse get(UUID userId, UUID id) {
        return foods.findById(id)
                .filter(food -> food.isVisibleTo(userId))
                .map(FoodResponse::from)
                .orElseThrow(() -> new ResourceNotFoundException("Food not found."));
    }

    /** Adds a custom food for this user. */
    @Transactional
    public FoodResponse create(UUID userId, CustomFoodRequest request) {
        Food food = new Food(
                userId,
                request.name().trim(),
                blankToNull(request.brand()),
                FoodCategory.OTHER,
                request.servingSize(),
                request.servingUnit(),
                request.calories(),
                request.proteinGrams(),
                request.carbsGrams(),
                request.fatGrams(),
                request.fiberGrams(),
                request.allergens() == null ? new HashSet<>() : request.allergens());
        return FoodResponse.from(foods.save(food));
    }

    /** Deletes one of the user's custom foods. Shared foods cannot be deleted. */
    @Transactional
    public void delete(UUID userId, UUID id) {
        Food food = foods.findById(id)
                .filter(candidate -> candidate.isOwnedBy(userId))
                .orElseThrow(() -> new ResourceNotFoundException("Food not found."));
        foods.delete(food);
    }

    private static String blankToNull(String text) {
        return text == null || text.isBlank() ? null : text.trim();
    }
}
