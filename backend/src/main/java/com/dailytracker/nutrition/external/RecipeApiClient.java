package com.dailytracker.nutrition.external;

import com.dailytracker.nutrition.exception.ExternalServiceUnavailableException;
import com.dailytracker.nutrition.exception.InvalidRequestException;
import com.dailytracker.nutrition.exception.RateLimitedException;
import com.dailytracker.nutrition.exception.ResourceNotFoundException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Map;

/**
 * Recipe API (recipe-api.com): recipes with nutrition per serving. Needs RECIPE_API_KEY in .env.
 * The key is sent in the X-API-Key header only, so it never appears in a URL or in an error message.
 * Searching is free on every plan; opening a full recipe uses a credit, so only search is used here.
 */
@Component
public class RecipeApiClient {

    static final String SERVICE_NAME = "The nutrition recipe service";
    private static final String BASE_URL = "https://recipe-api.com/api/v1";

    private final HttpClient http = ExternalHttp.client();
    private final ObjectMapper mapper;
    private final String apiKey;

    public RecipeApiClient(ObjectMapper mapper, @Value("${RECIPE_API_KEY:}") String apiKey) {
        this.mapper = mapper;
        this.apiKey = apiKey == null ? "" : apiKey.trim();
    }

    public boolean isConfigured() {
        return !apiKey.isBlank();
    }

    /** GET of one path with query parameters. Maps the API's error responses to the app's exceptions. */
    public JsonNode get(String path, Map<String, String> query) {
        if (!isConfigured()) {
            throw new ExternalServiceUnavailableException("The nutrition recipe service is not set up yet.");
        }
        StringBuilder url = new StringBuilder(BASE_URL).append(path);
        String separator = "?";
        for (Map.Entry<String, String> entry : query.entrySet()) {
            url.append(separator)
                    .append(URLEncoder.encode(entry.getKey(), StandardCharsets.UTF_8))
                    .append('=')
                    .append(URLEncoder.encode(entry.getValue(), StandardCharsets.UTF_8));
            separator = "&";
        }
        HttpRequest request = HttpRequest.newBuilder(URI.create(url.toString()))
                .timeout(Duration.ofSeconds(10))
                .header("Accept", "application/json")
                .header("X-API-Key", apiKey)
                .GET()
                .build();

        HttpResponse<String> response;
        try {
            response = http.send(request, HttpResponse.BodyHandlers.ofString());
        } catch (IOException e) {
            throw new ExternalServiceUnavailableException(SERVICE_NAME + " is not reachable right now.");
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new ExternalServiceUnavailableException(SERVICE_NAME + " is not reachable right now.");
        }

        switch (response.statusCode()) {
            case 200 -> {
                try {
                    return mapper.readTree(response.body());
                } catch (IOException e) {
                    throw new ExternalServiceUnavailableException(SERVICE_NAME + " returned unreadable data.");
                }
            }
            case 400 -> throw new InvalidRequestException("The nutrition recipe service did not accept this search.");
            case 401 -> throw new ExternalServiceUnavailableException(SERVICE_NAME + " did not accept the API key.");
            case 403 -> throw new ExternalServiceUnavailableException(SERVICE_NAME + " is not available on this plan.");
            case 404 -> throw new ResourceNotFoundException("No nutrition recipe was found.");
            case 429 -> throw new RateLimitedException("The nutrition recipe service limit was reached. Please try again later.");
            default -> throw new ExternalServiceUnavailableException(SERVICE_NAME + " is not available right now.");
        }
    }
}
