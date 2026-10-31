package com.dailytracker.nutrition.service;

import com.dailytracker.nutrition.exception.InvalidRequestException;
import com.dailytracker.nutrition.exception.ResourceNotFoundException;
import com.dailytracker.nutrition.external.RecipeApiClient;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Finds calories and macros for a recipe by its name, using the free search of Recipe API.
 * Only an exact name match (ignoring case and punctuation) is used, so a wrong recipe is never shown.
 * Results are kept in memory for one hour only.
 */
@Service
public class NutritionLookupService {

    static final Duration CACHE_TTL = Duration.ofHours(1);
    static final int MAX_CACHE_ENTRIES = 500;
    static final int MAX_NAME_LENGTH = 120;
    private static final int SEARCH_RESULTS = 5;

    public record Macros(String matchedName, Double calories, Double proteinG, Double carbsG, Double fatG) {
        static Macros none() {
            return new Macros(null, null, null, null, null);
        }
    }

    private record Cached(Macros macros, Instant storedAt) {
    }

    private final RecipeApiClient recipeApi;
    private final Map<String, Cached> cache = new ConcurrentHashMap<>();

    public NutritionLookupService(RecipeApiClient recipeApi) {
        this.recipeApi = recipeApi;
    }

    public Macros lookup(String name) {
        String query = name == null ? "" : name.trim();
        if (query.isEmpty() || query.length() > MAX_NAME_LENGTH) {
            throw new InvalidRequestException("The recipe name must be 1 to 120 characters.");
        }
        String key = normalize(query);
        Cached cached = cache.get(key);
        if (cached != null && cached.storedAt().plus(CACHE_TTL).isAfter(Instant.now())) {
            return cached.macros();
        }
        Macros result = search(query, key);
        if (cache.size() >= MAX_CACHE_ENTRIES) {
            cache.clear();
        }
        cache.put(key, new Cached(result, Instant.now()));
        return result;
    }

    private Macros search(String query, String key) {
        JsonNode body;
        try {
            body = recipeApi.get("/recipes", Map.of("q", query, "per_page", String.valueOf(SEARCH_RESULTS)));
        } catch (ResourceNotFoundException e) {
            return Macros.none();
        }
        for (JsonNode recipe : body.path("data")) {
            String candidate = recipe.path("name").asText("");
            if (!normalize(candidate).equals(key)) {
                continue;
            }
            JsonNode summary = recipe.path("nutrition_summary");
            return new Macros(
                    candidate,
                    number(summary, "calories"),
                    number(summary, "protein_g"),
                    number(summary, "carbohydrates_g"),
                    number(summary, "fat_g"));
        }
        return Macros.none();
    }

    static String normalize(String text) {
        return text.toLowerCase(Locale.ROOT).replaceAll("[^\\p{L}\\p{N}]+", " ").trim();
    }

    private static Double number(JsonNode node, String field) {
        JsonNode value = node.path(field);
        return value.isNumber() ? value.asDouble() : null;
    }
}
