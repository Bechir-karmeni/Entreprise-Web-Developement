package com.dailytracker.nutrition.dto;

import com.dailytracker.nutrition.exception.InvalidRequestException;

/**
 * Search input for online recipes. A name search takes priority over the category and area filters,
 * because TheMealDB's free API can only filter by one of them at a time.
 */
public record OnlineRecipeFilters(String search, String category, String area) {

    private static final int MAX_TEXT = 100;

    public OnlineRecipeFilters {
        search = clean(search, "Search text");
        category = clean(category, "Category");
        area = clean(area, "Area");
    }

    public boolean isEmpty() {
        return search == null && category == null && area == null;
    }

    private static String clean(String value, String name) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String trimmed = value.trim();
        if (trimmed.length() > MAX_TEXT) {
            throw new InvalidRequestException(name + " must be at most " + MAX_TEXT + " characters.");
        }
        return trimmed;
    }
}
