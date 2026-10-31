package com.dailytracker.nutrition.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.dailytracker.nutrition.external.RecipeApiClient;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

class NutritionLookupServiceTest {

    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void usesTheMacrosOfAnExactNameMatch() throws Exception {
        RecipeApiClient api = mock(RecipeApiClient.class);
        when(api.get(anyString(), anyMap())).thenReturn(mapper.readTree("""
                {"data": [
                  {"name": "Chicken Tikka Masala", "nutrition_summary": {"calories": 500, "protein_g": 30, "carbohydrates_g": 20, "fat_g": 25}},
                  {"name": "Chicken, Tikka Masala!", "nutrition_summary": {"calories": 569, "protein_g": 44.1, "carbohydrates_g": 5.6, "fat_g": null}}
                ]}
                """));

        NutritionLookupService.Macros macros = new NutritionLookupService(api).lookup("chicken tikka masala");

        assertThat(macros.matchedName()).isEqualTo("Chicken Tikka Masala");
        assertThat(macros.calories()).isEqualTo(500.0);
        assertThat(macros.proteinG()).isEqualTo(30.0);
    }

    @Test
    void partialNamesAreNotMatched() throws Exception {
        RecipeApiClient api = mock(RecipeApiClient.class);
        when(api.get(anyString(), anyMap())).thenReturn(mapper.readTree("""
                {"data": [{"name": "Texas Chili con Carne", "nutrition_summary": {"calories": 569}}]}
                """));

        NutritionLookupService.Macros macros = new NutritionLookupService(api).lookup("Chili");

        assertThat(macros.matchedName()).isNull();
        assertThat(macros.calories()).isNull();
    }

    @Test
    void secondLookupOfTheSameNameUsesTheCache() throws Exception {
        RecipeApiClient api = mock(RecipeApiClient.class);
        when(api.get(anyString(), anyMap())).thenReturn(mapper.readTree("{\"data\": []}"));
        NutritionLookupService service = new NutritionLookupService(api);

        service.lookup("Pancakes");
        service.lookup("  pancakes ");

        verify(api, times(1)).get(anyString(), anyMap());
    }
}
