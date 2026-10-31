package com.dailytracker.nutrition.dto;

import java.util.List;

/** Positions (0 for the first) of the ingredients to add. Null or empty means all of them. */
public record OnlineRecipeShoppingRequest(List<Integer> ingredientIndexes) {
}
