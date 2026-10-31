package com.dailytracker.nutrition.external;

import com.dailytracker.nutrition.food.Allergen;
import com.dailytracker.nutrition.food.FoodCategory;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * Open Food Facts: free, no API key. Requires a User-Agent header. Search is limited to 10 requests
 * per minute per IP address, so callers must throttle (see ExternalFoodService).
 */
@Component
public class OpenFoodFactsClient {

    static final String SERVICE_NAME = "Open Food Facts";
    static final String SOURCE = "OPEN_FOOD_FACTS";
    private static final String SEARCH_URL = "https://world.openfoodfacts.org/cgi/search.pl";
    private static final String PRODUCT_URL = "https://world.openfoodfacts.org/api/v2/product/";
    private static final String USER_AGENT = "DailyTrackerNutrition/0.1 (student project)";

    private final HttpClient http = ExternalHttp.client();
    private final ObjectMapper mapper;

    public OpenFoodFactsClient(ObjectMapper mapper) {
        this.mapper = mapper;
    }

    public List<ExternalFood> search(String text, int pageSize) {
        String url = SEARCH_URL
                + "?search_terms=" + URLEncoder.encode(text, StandardCharsets.UTF_8)
                + "&search_simple=1&action=process&json=1&page_size=" + pageSize;
        String body = ExternalHttp.get(http, URI.create(url), SERVICE_NAME, Map.of("User-Agent", USER_AGENT));
        try {
            return parse(mapper.readTree(body));
        } catch (IOException e) {
            throw new ExternalFoodException(SERVICE_NAME + " returned unreadable data.");
        }
    }

    /** Looks up one product by its barcode. Empty when Open Food Facts has no usable product with that code. */
    public Optional<ExternalFood> lookup(String barcode) {
        String url = PRODUCT_URL + barcode + ".json";
        String body = ExternalHttp.get(http, URI.create(url), SERVICE_NAME, Map.of("User-Agent", USER_AGENT));
        try {
            JsonNode root = mapper.readTree(body);
            if (root.path("status").asInt(0) != 1) {
                return Optional.empty();
            }
            return productFrom(root.path("product"));
        } catch (IOException e) {
            throw new ExternalFoodException(SERVICE_NAME + " returned unreadable data.");
        }
    }

    /** Converts the search response. Products without a name or energy value are skipped. */
    static List<ExternalFood> parse(JsonNode root) {
        List<ExternalFood> foods = new ArrayList<>();
        for (JsonNode product : root.path("products")) {
            productFrom(product).ifPresent(foods::add);
        }
        return foods;
    }

    /** Converts one product. Empty when it has no name, code or energy value. */
    static Optional<ExternalFood> productFrom(JsonNode product) {
        String code = product.path("code").asText("").trim();
        String name = product.path("product_name").asText("").trim();
        JsonNode nutriments = product.path("nutriments");
        if (code.isBlank() || name.isBlank() || !nutriments.has("energy-kcal_100g")) {
            return Optional.empty();
        }
        String brand = product.path("brands").asText("").trim();
        JsonNode tags = product.path("allergens_tags");
        Set<Allergen> allergens = allergensFromTags(tags);
        // An empty list usually means the allergens were not entered, not that there are none.
        boolean allergensKnown = tags.isArray() && tags.size() > 0;

        return Optional.of(new ExternalFood(
                SOURCE,
                code,
                name,
                brand.isBlank() ? null : brand,
                FoodCategory.OTHER,
                100,
                "g",
                (int) Math.round(nutriments.path("energy-kcal_100g").asDouble(0)),
                nutriments.path("proteins_100g").asDouble(0),
                nutriments.path("carbohydrates_100g").asDouble(0),
                nutriments.path("fat_100g").asDouble(0),
                nutriments.path("fiber_100g").asDouble(0),
                allergens,
                allergensKnown));
    }

    /** Maps Open Food Facts allergen tags to our allergen names. Unknown tags are ignored. */
    static Set<Allergen> allergensFromTags(JsonNode tags) {
        Set<Allergen> result = EnumSet.noneOf(Allergen.class);
        if (tags == null || !tags.isArray()) {
            return result;
        }
        for (JsonNode tag : tags) {
            switch (tag.asText("")) {
                case "en:milk" -> result.add(Allergen.MILK);
                case "en:eggs" -> result.add(Allergen.EGGS);
                case "en:gluten" -> result.add(Allergen.GLUTEN);
                case "en:wheat" -> result.add(Allergen.WHEAT);
                case "en:peanuts" -> result.add(Allergen.PEANUTS);
                case "en:nuts" -> result.add(Allergen.TREE_NUTS);
                case "en:soybeans" -> result.add(Allergen.SOY);
                case "en:sesame-seeds" -> result.add(Allergen.SESAME);
                case "en:fish" -> result.add(Allergen.FISH);
                case "en:crustaceans", "en:molluscs" -> result.add(Allergen.SHELLFISH);
                default -> {
                    // Tags for allergens we do not track are ignored.
                }
            }
        }
        return result;
    }
}
