package com.dailytracker.nutrition.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.dailytracker.nutrition.exception.InvalidTokenException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import org.junit.jupiter.api.Test;

class GoogleTokenVerifierTest {

    private static final String CLIENT = "test-client.apps.googleusercontent.com";
    private final ObjectMapper mapper = new ObjectMapper();

    private String info(String aud, String iss, long exp, String verified) {
        return """
                {"aud": "%s", "iss": "%s", "exp": "%d", "email": "Anna.Test@Example.com",
                 "email_verified": "%s", "given_name": "Anna", "family_name": "Test"}
                """.formatted(aud, iss, exp, verified);
    }

    @Test
    void acceptsAVerifiedTokenForThisClient() throws Exception {
        long future = Instant.now().getEpochSecond() + 300;
        var profile = GoogleTokenVerifier.parse(
                mapper.readTree(info(CLIENT, "https://accounts.google.com", future, "true")), CLIENT, Instant.now());

        assertThat(profile.email()).isEqualTo("anna.test@example.com");
        assertThat(profile.firstName()).isEqualTo("Anna");
        assertThat(profile.lastName()).isEqualTo("Test");
    }

    @Test
    void rejectsATokenIssuedForAnotherClient() throws Exception {
        long future = Instant.now().getEpochSecond() + 300;
        assertThatThrownBy(() -> GoogleTokenVerifier.parse(
                mapper.readTree(info("someone-else", "accounts.google.com", future, "true")), CLIENT, Instant.now()))
                .isInstanceOf(InvalidTokenException.class);
    }

    @Test
    void rejectsAnUnverifiedEmail() throws Exception {
        long future = Instant.now().getEpochSecond() + 300;
        assertThatThrownBy(() -> GoogleTokenVerifier.parse(
                mapper.readTree(info(CLIENT, "accounts.google.com", future, "false")), CLIENT, Instant.now()))
                .isInstanceOf(InvalidTokenException.class);
    }

    @Test
    void rejectsAnExpiredToken() throws Exception {
        long past = Instant.now().getEpochSecond() - 10;
        assertThatThrownBy(() -> GoogleTokenVerifier.parse(
                mapper.readTree(info(CLIENT, "accounts.google.com", past, "true")), CLIENT, Instant.now()))
                .isInstanceOf(InvalidTokenException.class);
    }
}
