package com.dailytracker.nutrition.service;

import com.dailytracker.nutrition.dto.ShoppingItemRequest;
import com.dailytracker.nutrition.dto.ShoppingItemResponse;
import com.dailytracker.nutrition.entity.Food;
import com.dailytracker.nutrition.entity.Recipe;
import com.dailytracker.nutrition.entity.RecipeIngredient;
import com.dailytracker.nutrition.exception.InvalidRequestException;
import com.dailytracker.nutrition.exception.ResourceNotFoundException;
import com.dailytracker.nutrition.food.FoodCategory;
import com.dailytracker.nutrition.repository.RecipeRepository;
import com.dailytracker.nutrition.shopping.ShoppingCategory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;

/** Copies the ingredients of a recipe onto the user's shopping list, scaled to the chosen number of portions. */
@Service
public class RecipeShoppingService {

    static final int MAX_PORTIONS = 8;
    private static final String OPEN_FOOD_FACTS = "OPEN_FOOD_FACTS";
    private static final Pattern BARCODE = Pattern.compile("\\d{6,14}");

    private final RecipeRepository recipes;
    private final ShoppingListService shopping;

    public RecipeShoppingService(RecipeRepository recipes, ShoppingListService shopping) {
        this.recipes = recipes;
        this.shopping = shopping;
    }

    @Transactional
    public List<ShoppingItemResponse> addIngredients(UUID userId, UUID recipeId, Integer portions, List<UUID> foodIds) {
        int count = portions == null ? 1 : portions;
        if (count < 1 || count > MAX_PORTIONS) {
            throw new InvalidRequestException("Choose between 1 and 8 portions.");
        }
        Recipe recipe = recipes.findById(recipeId)
                .orElseThrow(() -> new ResourceNotFoundException("Recipe not found."));
        Set<UUID> wanted = foodIds == null || foodIds.isEmpty() ? null : Set.copyOf(foodIds);

        List<ShoppingItemResponse> added = new ArrayList<>();
        for (RecipeIngredient ingredient : recipe.getIngredients()) {
            Food food = ingredient.getFood();
            if (wanted != null && !wanted.contains(food.getId())) {
                continue;
            }
            double amount = ingredient.getGrams() / recipe.getServings() * count;
            String quantity = Math.max(1, (long) Math.round(amount)) + " " + food.getServingUnit();
            added.add(shopping.add(userId, new ShoppingItemRequest(
                    food.getName(), quantity, category(food.getCategory()), barcodeOf(food))));
        }
        if (added.isEmpty()) {
            throw new InvalidRequestException("Choose at least one ingredient of this recipe.");
        }
        return added;
    }

    /** Only foods imported from Open Food Facts keep their barcode, which is stored as the external id. */
    static String barcodeOf(Food food) {
        String code = food.getExternalId();
        if (OPEN_FOOD_FACTS.equals(food.getSource()) && code != null && BARCODE.matcher(code).matches()) {
            return code;
        }
        return null;
    }

    static ShoppingCategory category(FoodCategory category) {
        return switch (category) {
            case PROTEIN, FISH -> ShoppingCategory.PROTEIN;
            case DAIRY -> ShoppingCategory.DAIRY;
            case VEGETABLE, FRUIT -> ShoppingCategory.PRODUCE;
            case GRAIN, LEGUME, NUTS_AND_SEEDS, FAT -> ShoppingCategory.GRAINS_PANTRY;
            default -> ShoppingCategory.OTHER;
        };
    }
}
