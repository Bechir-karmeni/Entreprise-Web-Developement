package com.dailytracker.nutrition.dto;

import com.dailytracker.nutrition.external.OnlineRecipe;

import java.util.UUID;

/** A recipe the user saved from the online service. The id is the saved entry's id, used to remove it. */
public record SavedOnlineRecipeResponse(UUID id, OnlineRecipe recipe) {
}
