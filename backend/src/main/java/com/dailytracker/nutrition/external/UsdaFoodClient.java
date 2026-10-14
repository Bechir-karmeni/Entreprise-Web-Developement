package com.dailytracker.nutrition.external;

import com.dailytracker.nutrition.food.Allergen;
import com.dailytracker.nutrition.food.FoodCategory;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * USDA FoodData Central: free with an API key (FOOD_API_KEY in .env). Values are per 100 g.
 * The USDA search does not list allergens, so results are marked allergensKnown = false.
 */
@Component
public class UsdaFoodClient {

    static final String SERVICE_NAME = "USDA FoodData Central";
    static final String SOURCE = "USDA";
    private static final String SEARCH_URL = "https://api.nal.usda.gov/fdc/v1/foods/search";
    private static final int ENERGY_KCAL = 1008;
    private static final int PROTEIN = 1003;
    private static final int FAT = 1004;
    private static final int CARBS = 1005;
    private static final int FIBER = 1079;

    private final HttpClient http = ExternalHttp.client();
    private final ObjectMapper mapper;
    private final String apiKey;

    public UsdaFoodClient(ObjectMapper mapper, @Value("${FOOD_API_KEY:}") String apiKey) {
        this.mapper = mapper;
        this.apiKey = apiKey == null ? "" : apiKey.trim();
    }

    public boolean isConfigured() {
        return !apiKey.isBlank();
    }

    public List<ExternalFood> search(String text, int pageSize) {
        if (!isConfigured()) {
            return List.of();
        }
        String url = SEARCH_URL
                + "?api_key=" + URLEncoder.encode(apiKey, StandardCharsets.UTF_8)
                + "&query=" + URLEncoder.encode(text, StandardCharsets.UTF_8)
                + "&pageSize=" + pageSize
                + "&dataType=" + URLEncoder.encode("Foundation,SR Legacy", StandardCharsets.UTF_8);
        String body = ExternalHttp.get(http, URI.create(url), SERVICE_NAME, Map.of());
        try {
            return parse(mapper.readTree(body));
        } catch (IOException e) {
            throw new ExternalFoodException(SERVICE_NAME + " returned unreadable data.");
        }
    }

    /** Converts the search response. Foods without a description or an energy value are skipped. */
    static List<ExternalFood> parse(JsonNode root) {
        List<ExternalFood> foods = new ArrayList<>();
        for (JsonNode food : root.path("foods")) {
            long fdcId = food.path("fdcId").asLong(0);
            String description = food.path("description").asText("").trim();
            Map<Integer, Double> nutrients = new HashMap<>();
            for (JsonNode nutrient : food.path("foodNutrients")) {
                nutrients.put(nutrient.path("nutrientId").asInt(0), nutrient.path("value").asDouble(0));
            }
            if (fdcId == 0 || description.isBlank() || !nutrients.containsKey(ENERGY_KCAL)) {
                continue;
            }
            foods.add(new ExternalFood(
                    SOURCE,
                    String.valueOf(fdcId),
                    description,
                    null,
                    FoodCategory.OTHER,
                    100,
                    "g",
                    (int) Math.round(nutrients.get(ENERGY_KCAL)),
                    nutrients.getOrDefault(PROTEIN, 0.0),
                    nutrients.getOrDefault(CARBS, 0.0),
                    nutrients.getOrDefault(FAT, 0.0),
                    nutrients.getOrDefault(FIBER, 0.0),
                    EnumSet.noneOf(Allergen.class),
                    false));
        }
        return foods;
    }
}
