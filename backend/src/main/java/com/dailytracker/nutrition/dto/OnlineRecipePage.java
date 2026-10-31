package com.dailytracker.nutrition.dto;

import com.dailytracker.nutrition.external.OnlineRecipe;

import java.util.List;

/** One page of online recipe search results. */
public record OnlineRecipePage(List<OnlineRecipe> items, int page, int lastPage, int total) {
}
