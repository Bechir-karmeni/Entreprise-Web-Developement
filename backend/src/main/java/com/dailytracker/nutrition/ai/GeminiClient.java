package com.dailytracker.nutrition.ai;

import com.dailytracker.nutrition.exception.ExternalServiceUnavailableException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

/**
 * Calls the Google Gemini API (Google AI Studio key). The API key is sent only in the x-goog-api-key header.
 * Error messages never contain the key or the raw response body.
 */
@Component
public class GeminiClient {

    private static final Logger log = LoggerFactory.getLogger(GeminiClient.class);
    private static final int MAX_OUTPUT_TOKENS = 2000;
    private static final int MAX_LOGGED_BODY = 500;

    private final RestClient restClient;
    private final String apiKey;
    private final String model;

    public GeminiClient(
            @Value("${app.ai.gemini.api-key:}") String apiKey,
            @Value("${app.ai.gemini.model}") String model,
            @Value("${app.ai.gemini.base-url}") String baseUrl) {
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.model = model;
        SimpleClientHttpRequestFactory requests = new SimpleClientHttpRequestFactory();
        requests.setConnectTimeout(5_000);
        requests.setReadTimeout(60_000);
        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .requestFactory(requests)
                .build();
    }

    public boolean isConfigured() {
        return !apiKey.isEmpty();
    }

    /** Sends one system prompt and one user message, and returns the text of the model's reply. */
    public String complete(String systemPrompt, String userMessage) {
        return send(systemPrompt, userMessage, false);
    }

    /** Same as complete, but asks the model to reply with JSON only. */
    public String completeJson(String systemPrompt, String userMessage) {
        return sendParts(systemPrompt, List.of(textPart(userMessage)), true);
    }

    /** Sends a photo (base64 data, for example image/jpeg) with a text instruction. Replies with JSON only. */
    public String completeJsonWithImage(String systemPrompt, String userMessage, String mimeType, String base64Data) {
        Map<String, Object> image = Map.of("inline_data", Map.of("mime_type", mimeType, "data", base64Data));
        return sendParts(systemPrompt, List.of(textPart(userMessage), image), true);
    }

    private static Map<String, Object> textPart(String text) {
        return Map.of("text", text);
    }

    private String send(String systemPrompt, String userMessage, boolean json) {
        return sendParts(systemPrompt, List.of(textPart(userMessage)), json);
    }

    private String sendParts(String systemPrompt, List<Map<String, Object>> parts, boolean json) {
        if (!isConfigured()) {
            throw new ExternalServiceUnavailableException("The AI analysis is not set up yet.");
        }
        Map<String, Object> generation = new HashMap<>();
        generation.put("maxOutputTokens", MAX_OUTPUT_TOKENS);
        if (json) {
            generation.put("responseMimeType", "application/json");
        }
        Map<String, Object> body = Map.of(
                "systemInstruction", Map.of("parts", List.of(Map.of("text", systemPrompt))),
                "contents", List.of(Map.of("role", "user", "parts", parts)),
                "generationConfig", generation);
        try {
            GenerateResponse response = restClient.post()
                    .uri("/v1beta/models/{model}:generateContent", model)
                    .header("x-goog-api-key", apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(GenerateResponse.class);
            String text = response == null ? "" : response.text();
            if (text.isBlank()) {
                throw new ExternalServiceUnavailableException("The AI analysis came back empty. Please try again.");
            }
            return text;
        } catch (RestClientResponseException e) {
            // Google's error text says why the request failed (wrong model, key or quota). It never contains our key.
            String detail = e.getResponseBodyAsString();
            log.warn("Gemini request failed with status {} for model {}: {}", e.getStatusCode(), model,
                    detail.length() > MAX_LOGGED_BODY ? detail.substring(0, MAX_LOGGED_BODY) : detail);
            throw new ExternalServiceUnavailableException("The AI analysis is not available right now. Please try again later.");
        } catch (RestClientException e) {
            log.warn("Gemini request failed for model {}: {}", model, e.getMessage());
            throw new ExternalServiceUnavailableException("The AI analysis is not available right now. Please try again later.");
        }
    }

    /** The parts of the generateContent response that are used. Unknown fields are ignored. */
    public record GenerateResponse(List<Candidate> candidates) {
        public record Candidate(Content content) {
        }

        public record Content(List<Part> parts) {
        }

        public record Part(String text) {
        }

        public String text() {
            if (candidates == null || candidates.isEmpty() || candidates.get(0).content() == null) {
                return "";
            }
            List<Part> parts = candidates.get(0).content().parts();
            if (parts == null) {
                return "";
            }
            return parts.stream()
                    .map(Part::text)
                    .filter(Objects::nonNull)
                    .collect(Collectors.joining("\n"));
        }
    }
}
