package com.dailytracker.nutrition.dto;

import java.util.List;

public record FridgeRecommendation(
        List<String> items,
        List<OwnFridgeMatch> ownRecipes,
        List<OnlineFridgeMatch> onlineRecipes
) {
}
