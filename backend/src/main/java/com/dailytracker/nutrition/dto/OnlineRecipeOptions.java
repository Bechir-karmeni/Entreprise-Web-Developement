package com.dailytracker.nutrition.dto;

import java.util.List;

/** The categories and areas that the filters can use. */
public record OnlineRecipeOptions(List<String> categories, List<String> areas) {
}
