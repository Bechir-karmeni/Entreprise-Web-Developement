package com.dailytracker.nutrition.controller;

import com.dailytracker.nutrition.dto.CustomFoodRequest;
import com.dailytracker.nutrition.dto.FoodResponse;
import com.dailytracker.nutrition.dto.PageResponse;
import com.dailytracker.nutrition.food.FoodScope;
import com.dailytracker.nutrition.service.ExternalFoodService;
import com.dailytracker.nutrition.service.FoodFavoriteService;
import com.dailytracker.nutrition.service.FoodService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/foods")
public class FoodController {

    private final FoodService foodService;
    private final ExternalFoodService externalFoodService;
    private final FoodFavoriteService favoriteService;

    public FoodController(FoodService foodService, ExternalFoodService externalFoodService,
                          FoodFavoriteService favoriteService) {
        this.foodService = foodService;
        this.externalFoodService = externalFoodService;
        this.favoriteService = favoriteService;
    }

    /** Looks up a product by its barcode in Open Food Facts, saves it, and returns it. */
    @GetMapping("/barcode/{code}")
    public FoodResponse barcode(@PathVariable String code) {
        return externalFoodService.lookupBarcode(code);
    }

    /** The user's starred foods, most recently starred first. */
    @GetMapping("/favorites")
    public List<FoodResponse> favorites(@AuthenticationPrincipal UUID userId) {
        return favoriteService.list(userId);
    }

    @PutMapping("/{id}/favorite")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void addFavorite(@AuthenticationPrincipal UUID userId, @PathVariable UUID id) {
        favoriteService.add(userId, id);
    }

    @DeleteMapping("/{id}/favorite")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeFavorite(@AuthenticationPrincipal UUID userId, @PathVariable UUID id) {
        favoriteService.remove(userId, id);
    }

    /** Searches shared foods (scope=COMMON, the default) or the user's own custom foods (scope=CUSTOM). */
    @GetMapping
    public PageResponse<FoodResponse> search(
            @AuthenticationPrincipal UUID userId,
            @RequestParam(defaultValue = "") String query,
            @RequestParam(defaultValue = "COMMON") FoodScope scope,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return foodService.search(userId, query, scope, page, size);
    }

    /** Searches Open Food Facts and USDA, saves the results, and returns them. Limited to one call every 6 seconds. */
    @GetMapping("/online")
    public List<FoodResponse> searchOnline(@RequestParam(defaultValue = "") String query) {
        return externalFoodService.search(query);
    }

    @GetMapping("/{id}")
    public FoodResponse get(@AuthenticationPrincipal UUID userId, @PathVariable UUID id) {
        return foodService.get(userId, id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public FoodResponse create(@AuthenticationPrincipal UUID userId, @Valid @RequestBody CustomFoodRequest request) {
        return foodService.create(userId, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal UUID userId, @PathVariable UUID id) {
        foodService.delete(userId, id);
    }
}
