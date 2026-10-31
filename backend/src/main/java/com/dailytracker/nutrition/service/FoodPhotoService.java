package com.dailytracker.nutrition.service;

import com.dailytracker.nutrition.ai.AnalysisCooldown;
import com.dailytracker.nutrition.ai.GeminiClient;
import com.dailytracker.nutrition.dto.FoodPhotoItem;
import com.dailytracker.nutrition.dto.FoodPhotoRequest;
import com.dailytracker.nutrition.exception.ExternalServiceUnavailableException;
import com.dailytracker.nutrition.exception.InvalidRequestException;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Finds the foods in a meal photo with Gemini and estimates their nutrition. Nothing is saved here:
 * the app logs the foods the user keeps, through the normal food log.
 */
@Service
public class FoodPhotoService {

    static final int MAX_IMAGE_CHARS = 6_000_000;
    static final Duration PHOTO_WAIT = Duration.ofSeconds(15);
    private static final int MAX_ITEMS = 12;
    private static final double MAX_CALORIES = 5_000;
    private static final double MAX_GRAMS = 5_000;
    private static final int MAX_NAME = 100;
    private static final ObjectMapper JSON = new ObjectMapper();

    private static final String SYSTEM_PROMPT = """
            You estimate the food in a photo of a meal for a nutrition app.
            Reply with only JSON in this shape: {"items": [{"name": "...", "grams": 0, "calories": 0, "proteinGrams": 0, "carbsGrams": 0, "fatGrams": 0, "fiberGrams": 0}]}
            - Give one item for each distinct food you can see, with the amount visible on the plate in grams.
            - Calories and macros are for that amount. Use typical values for the food, and give your best estimate.
            - Name each item in the language named in the message.
            - If no food is visible, reply with {"items": []}.
            - Do not add any text outside the JSON.
            """;

    private final GeminiClient gemini;
    private final AnalysisCooldown cooldown;

    public FoodPhotoService(GeminiClient gemini, AnalysisCooldown cooldown) {
        this.gemini = gemini;
        this.cooldown = cooldown;
    }

    public List<FoodPhotoItem> analyse(UUID userId, FoodPhotoRequest request) {
        if (!gemini.isConfigured()) {
            throw new ExternalServiceUnavailableException("The AI photo scan is not set up yet.");
        }
        if (request.imageBase64().length() > MAX_IMAGE_CHARS) {
            throw new InvalidRequestException("This photo is too large. Please use a smaller one.");
        }
        cooldown.requireAllowed(userId, "photo", PHOTO_WAIT, "Please wait a few seconds before scanning another photo.");
        String language = "de".equals(request.language()) ? "German" : "English";
        String reply = gemini.completeJsonWithImage(SYSTEM_PROMPT,
                "Write the food names in " + language + ". Analyse this meal photo.",
                request.mimeType(), request.imageBase64());
        return parse(reply);
    }

    /** Reads the model's JSON. Items without a name or with odd numbers are skipped or clamped. */
    static List<FoodPhotoItem> parse(String reply) {
        List<FoodPhotoItem> items = new ArrayList<>();
        JsonNode root;
        try {
            root = JSON.readTree(stripFence(reply));
        } catch (JsonProcessingException | IllegalArgumentException e) {
            throw new ExternalServiceUnavailableException("The AI could not read this photo. Please try another one.");
        }
        for (JsonNode node : root.path("items")) {
            if (items.size() >= MAX_ITEMS) {
                break;
            }
            String name = node.path("name").asText("").trim();
            if (name.isEmpty()) {
                continue;
            }
            items.add(new FoodPhotoItem(
                    truncate(name, MAX_NAME),
                    clamp(node.path("grams").asDouble(0), MAX_GRAMS),
                    clamp(node.path("calories").asDouble(0), MAX_CALORIES),
                    clamp(node.path("proteinGrams").asDouble(0), MAX_GRAMS),
                    clamp(node.path("carbsGrams").asDouble(0), MAX_GRAMS),
                    clamp(node.path("fatGrams").asDouble(0), MAX_GRAMS),
                    clamp(node.path("fiberGrams").asDouble(0), MAX_GRAMS)));
        }
        return items;
    }

    private static double clamp(double value, double max) {
        if (Double.isNaN(value) || value < 0) {
            return 0;
        }
        return Math.min(Math.round(value * 10) / 10.0, max);
    }

    private static String stripFence(String reply) {
        String text = reply == null ? "" : reply.trim();
        if (text.startsWith("```")) {
            int firstLineEnd = text.indexOf('\n');
            text = firstLineEnd < 0 ? "" : text.substring(firstLineEnd + 1);
            if (text.endsWith("```")) {
                text = text.substring(0, text.length() - 3);
            }
        }
        return text.trim();
    }

    private static String truncate(String value, int max) {
        return value.length() <= max ? value : value.substring(0, max);
    }
}
