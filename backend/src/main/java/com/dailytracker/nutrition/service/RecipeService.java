package com.dailytracker.nutrition.service;

import com.dailytracker.nutrition.dto.NutrientTotals;
import com.dailytracker.nutrition.dto.RecipeIngredientResponse;
import com.dailytracker.nutrition.dto.RecipeResponse;
import com.dailytracker.nutrition.entity.Food;
import com.dailytracker.nutrition.entity.Recipe;
import com.dailytracker.nutrition.entity.RecipeIngredient;
import com.dailytracker.nutrition.exception.ResourceNotFoundException;
import com.dailytracker.nutrition.repository.RecipeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.List;
import java.util.UUID;

@Service
public class RecipeService {

    private final RecipeRepository recipes;

    public RecipeService(RecipeRepository recipes) {
        this.recipes = recipes;
    }

    @Transactional(readOnly = true)
    public List<RecipeResponse> list() {
        return recipes.findAllByOrderByNameAsc().stream().map(RecipeService::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public RecipeResponse get(UUID id) {
        return recipes.findById(id)
                .map(RecipeService::toResponse)
                .orElseThrow(() -> new ResourceNotFoundException("Recipe not found."));
    }

    static RecipeResponse toResponse(Recipe recipe) {
        List<RecipeIngredientResponse> ingredients = recipe.getIngredients().stream()
                .map(item -> new RecipeIngredientResponse(item.getFood().getId(), item.getFood().getName(), item.getGrams()))
                .toList();
        return new RecipeResponse(
                recipe.getId(),
                recipe.getName(),
                recipe.getDescription(),
                recipe.getServings(),
                recipe.getPrepMinutes(),
                splitTags(recipe.getTags()),
                perServing(recipe.getIngredients(), recipe.getServings()),
                Arrays.stream(recipe.getSteps().split("\n")).map(String::trim).filter(step -> !step.isEmpty()).toList(),
                ingredients);
    }

    /** Nutrition of one serving: each food is scaled from its serving size to the grams used in the recipe. */
    static NutrientTotals perServing(List<RecipeIngredient> ingredients, int servings) {
        double calories = 0;
        double protein = 0;
        double carbs = 0;
        double fat = 0;
        double fiber = 0;
        for (RecipeIngredient item : ingredients) {
            Food food = item.getFood();
            double factor = item.getGrams() / food.getServingSize();
            calories += food.getCalories() * factor;
            protein += food.getProtein() * factor;
            carbs += food.getCarbs() * factor;
            fat += food.getFat() * factor;
            fiber += food.getFiber() * factor;
        }
        return new NutrientTotals(
                (int) Math.round(calories / servings),
                round1(protein / servings),
                round1(carbs / servings),
                round1(fat / servings),
                round1(fiber / servings));
    }

    static List<String> splitTags(String tags) {
        return Arrays.stream(tags.split(",")).map(String::trim).filter(tag -> !tag.isEmpty()).toList();
    }

    static double round1(double value) {
        return Math.round(value * 10.0) / 10.0;
    }
}
