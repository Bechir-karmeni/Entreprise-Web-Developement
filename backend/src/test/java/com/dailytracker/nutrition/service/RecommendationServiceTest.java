package com.dailytracker.nutrition.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;

class RecommendationServiceTest {

    @Test
    void readsTagAndKeywordFromAProteinPrompt() {
        RecommendationService.PromptIntent intent = RecommendationService.parse("high protein meal with chicken");

        assertTrue(intent.tags().contains("HIGH_PROTEIN"));
        assertEquals(List.of("chicken"), intent.keywords());
    }

    @Test
    void quickAndVegetarianWithoutKeywords() {
        RecommendationService.PromptIntent intent = RecommendationService.parse("quick vegetarian dinner");

        assertEquals(Set.of("QUICK", "VEGETARIAN"), intent.tags());
        assertTrue(intent.keywords().isEmpty());
    }

    @Test
    void shortWordsAndEmptyPromptsGiveNothing() {
        assertTrue(RecommendationService.parse("a of to").keywords().isEmpty());
        assertTrue(RecommendationService.parse(null).tags().isEmpty());
    }
}
