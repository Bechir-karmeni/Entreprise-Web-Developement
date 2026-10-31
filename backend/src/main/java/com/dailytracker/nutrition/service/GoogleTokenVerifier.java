package com.dailytracker.nutrition.service;

import com.dailytracker.nutrition.exception.ExternalServiceUnavailableException;
import com.dailytracker.nutrition.exception.InvalidTokenException;
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
import java.time.Instant;
import java.util.Locale;

/**
 * Checks a Google sign-in token with Google and returns the verified email and name.
 * Only tokens issued for this app's client ID (GOOGLE_CLIENT_ID) are accepted.
 */
@Component
public class GoogleTokenVerifier {

    static final String TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo?id_token=";
    private static final String REJECTED = "Google sign-in failed. Please try again.";
    private static final int MAX_NAME_LENGTH = 100;

    public record GoogleProfile(String email, String firstName, String lastName) {
    }

    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
    private final ObjectMapper mapper;
    private final String clientId;

    public GoogleTokenVerifier(ObjectMapper mapper, @Value("${app.google.client-id:}") String clientId) {
        this.mapper = mapper;
        this.clientId = clientId == null ? "" : clientId.trim();
    }

    public GoogleProfile verify(String idToken) {
        if (clientId.isBlank()) {
            throw new ExternalServiceUnavailableException("Google sign-in is not set up yet.");
        }
        URI uri = URI.create(TOKENINFO_URL + URLEncoder.encode(idToken, StandardCharsets.UTF_8));
        HttpResponse<String> response;
        try {
            response = http.send(
                    HttpRequest.newBuilder(uri).timeout(Duration.ofSeconds(10)).GET().build(),
                    HttpResponse.BodyHandlers.ofString());
        } catch (IOException e) {
            throw new ExternalServiceUnavailableException("Google could not be reached. Please try again.");
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new ExternalServiceUnavailableException("Google could not be reached. Please try again.");
        }
        if (response.statusCode() != 200) {
            throw new InvalidTokenException(REJECTED);
        }
        try {
            return parse(mapper.readTree(response.body()), clientId, Instant.now());
        } catch (IOException e) {
            throw new ExternalServiceUnavailableException("Google returned unreadable data.");
        }
    }

    /** Checks the audience, issuer, expiry and verified email in the token details that Google returns. */
    static GoogleProfile parse(JsonNode info, String clientId, Instant now) {
        if (!clientId.equals(info.path("aud").asText())) {
            throw new InvalidTokenException(REJECTED);
        }
        String issuer = info.path("iss").asText();
        if (!"accounts.google.com".equals(issuer) && !"https://accounts.google.com".equals(issuer)) {
            throw new InvalidTokenException(REJECTED);
        }
        long expiresAt = info.path("exp").asLong(0);
        if (expiresAt == 0 || Instant.ofEpochSecond(expiresAt).isBefore(now)) {
            throw new InvalidTokenException(REJECTED);
        }
        boolean verified = info.path("email_verified").asBoolean(false) || "true".equals(info.path("email_verified").asText());
        String email = info.path("email").asText("").trim().toLowerCase(Locale.ROOT);
        int at = email.indexOf('@');
        if (!verified || at <= 0) {
            throw new InvalidTokenException(REJECTED);
        }
        String firstName = clip(info.path("given_name").asText("").trim());
        String lastName = clip(info.path("family_name").asText("").trim());
        if (firstName.isEmpty()) {
            firstName = clip(email.substring(0, at));
        }
        if (lastName.isEmpty()) {
            lastName = "-";
        }
        return new GoogleProfile(email, firstName, lastName);
    }

    private static String clip(String text) {
        return text.length() <= MAX_NAME_LENGTH ? text : text.substring(0, MAX_NAME_LENGTH);
    }
}
