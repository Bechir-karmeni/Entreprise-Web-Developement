package com.dailytracker.nutrition.dto;

import java.util.List;
import java.util.UUID;

/**
 * Which ingredients of a recipe to add to the shopping list, and for how many portions.
 * A null or empty foodIds list means all ingredients.
 */
public record RecipeShoppingRequest(Integer portions, List<UUID> foodIds) {
}
