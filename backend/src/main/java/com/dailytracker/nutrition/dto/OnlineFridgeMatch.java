package com.dailytracker.nutrition.dto;

import com.dailytracker.nutrition.external.OnlineRecipe;

/** An online recipe, with how many of the user's fridge items it uses. */
public record OnlineFridgeMatch(OnlineRecipe recipe, int matchedItems) {
}
