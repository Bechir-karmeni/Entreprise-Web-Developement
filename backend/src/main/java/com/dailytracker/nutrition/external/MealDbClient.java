package com.dailytracker.nutrition.external;

import com.dailytracker.nutrition.exception.ExternalServiceUnavailableException;
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
import java.util.List;
import java.util.Map;

/**
 * TheMealDB, free endpoints only: name search, category and area filters, lookup by id, random meal.
 * The free test key "1" is the default. MEALDB_API_KEY in .env replaces it with a supporter key.
 */
@Component
public class MealDbClient {

    static final String SERVICE_NAME = "TheMealDB";
    private static final String BASE_PATTERN = "https://www.themealdb.com/api/json/v1/%s/";

    private final HttpClient http = ExternalHttp.client();
    private final ObjectMapper mapper;
    private final String baseUrl;

    public MealDbClient(ObjectMapper mapper, @Value("${MEALDB_API_KEY:1}") String apiKey) {
        this.mapper = mapper;
        String key = apiKey == null || apiKey.isBlank() ? "1" : apiKey.trim();
        this.baseUrl = BASE_PATTERN.formatted(key);
    }

    /** One GET, returning the parsed response. Network and server errors become ExternalServiceUnavailableException. */
    public JsonNode get(String endpoint, Map<String, String> params) {
        StringBuilder url = new StringBuilder(baseUrl).append(endpoint);
        String separator = "?";
        for (Map.Entry<String, String> param : params.entrySet()) {
            url.append(separator)
                    .append(URLEncoder.encode(param.getKey(), StandardCharsets.UTF_8))
                    .append('=')
                    .append(URLEncoder.encode(param.getValue(), StandardCharsets.UTF_8));
            separator = "&";
        }
        String body;
        try {
            body = ExternalHttp.get(http, URI.create(url.toString()), SERVICE_NAME, Map.of());
        } catch (ExternalFoodException e) {
            throw new ExternalServiceUnavailableException(SERVICE_NAME + " is not reachable right now.");
        }
        try {
            return mapper.readTree(body);
        } catch (IOException e) {
            throw new ExternalServiceUnavailableException(SERVICE_NAME + " returned unreadable data.");
        }
    }

    /** The "meals" array of a response. TheMealDB sends null when nothing matches, which gives an empty list. */
    public List<JsonNode> meals(String endpoint, Map<String, String> params) {
        List<JsonNode> meals = new ArrayList<>();
        for (JsonNode meal : get(endpoint, params).path("meals")) {
            meals.add(meal);
        }
        return meals;
    }
}
