package com.dailytracker.nutrition.food;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Stores vitamin and mineral amounts as JSON text, keyed by Micronutrient name.
 * Null means "no data", which is never the same as zero.
 */
public final class MicronutrientJson {

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final TypeReference<Map<String, Double>> TYPE = new TypeReference<>() {
    };

    private MicronutrientJson() {
    }

    /** Returns null when there is no data, so an empty map is never stored. */
    public static String write(Map<String, Double> values) {
        if (values == null || values.isEmpty()) {
            return null;
        }
        try {
            return MAPPER.writeValueAsString(values);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Could not store the vitamin and mineral values.", e);
        }
    }

    /** Returns null when there is no data or the stored text cannot be read. */
    public static Map<String, Double> read(String json) {
        if (json == null || json.isBlank()) {
            return null;
        }
        try {
            return MAPPER.readValue(json, TYPE);
        } catch (JsonProcessingException e) {
            return null;
        }
    }

    /** Scales values per 100 g to the amount eaten, rounded to two decimals. Null in, null out. */
    public static Map<String, Double> scale(Map<String, Double> per100g, double factor) {
        if (per100g == null || per100g.isEmpty()) {
            return null;
        }
        Map<String, Double> scaled = new LinkedHashMap<>();
        per100g.forEach((key, value) -> scaled.put(key, Math.round(value * factor * 100.0) / 100.0));
        return scaled;
    }
}
