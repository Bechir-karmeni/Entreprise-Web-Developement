package com.dailytracker.nutrition.controller;

import com.dailytracker.nutrition.dto.RecipeResponse;
import com.dailytracker.nutrition.dto.RecipeShoppingRequest;
import com.dailytracker.nutrition.dto.ShoppingItemResponse;
import com.dailytracker.nutrition.service.RecipeService;
import com.dailytracker.nutrition.service.RecipeShoppingService;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/recipes")
public class RecipeController {

    private final RecipeService recipeService;
    private final RecipeShoppingService recipeShoppingService;

    public RecipeController(RecipeService recipeService, RecipeShoppingService recipeShoppingService) {
        this.recipeService = recipeService;
        this.recipeShoppingService = recipeShoppingService;
    }

    @GetMapping
    public List<RecipeResponse> list() {
        return recipeService.list();
    }

    @GetMapping("/{id}")
    public RecipeResponse get(@PathVariable UUID id) {
        return recipeService.get(id);
    }

    /** Adds the chosen ingredients (or all of them) to the user's shopping list. */
    @PostMapping("/{id}/shopping")
    @ResponseStatus(HttpStatus.CREATED)
    public List<ShoppingItemResponse> addToShopping(@AuthenticationPrincipal UUID userId, @PathVariable UUID id,
                                                    @RequestBody(required = false) RecipeShoppingRequest request) {
        Integer portions = request == null ? null : request.portions();
        List<UUID> foodIds = request == null ? null : request.foodIds();
        return recipeShoppingService.addIngredients(userId, id, portions, foodIds);
    }
}
