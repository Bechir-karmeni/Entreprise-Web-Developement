package com.dailytracker.nutrition.security;

import com.dailytracker.nutrition.exception.InvalidTokenException;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtServiceTest {

    private static final String ACCESS_SECRET = "access-secret-for-unit-tests-only-0123456789";
    private static final String REFRESH_SECRET = "refresh-secret-for-unit-tests-only-9876543210";
    private static final long ONE_MINUTE = 60_000L;
    private static final long ONE_DAY = 86_400_000L;

    private final JwtService jwtService = new JwtService(ACCESS_SECRET, REFRESH_SECRET, ONE_MINUTE, ONE_DAY);

    @Test
    void accessTokenReturnsTheSameUserId() {
        UUID userId = UUID.randomUUID();
        String token = jwtService.generateAccessToken(userId);

        assertThat(jwtService.extractAccessUserId(token)).isEqualTo(userId);
    }

    @Test
    void refreshTokenCannotBeUsedAsAccessToken() {
        String refreshToken = jwtService.generateRefreshToken(UUID.randomUUID());

        assertThatThrownBy(() -> jwtService.extractAccessUserId(refreshToken))
                .isInstanceOf(InvalidTokenException.class);
    }

    @Test
    void accessTokenCannotBeUsedAsRefreshToken() {
        String accessToken = jwtService.generateAccessToken(UUID.randomUUID());

        assertThatThrownBy(() -> jwtService.extractRefreshUserId(accessToken))
                .isInstanceOf(InvalidTokenException.class);
    }

    @Test
    void tamperedTokenIsRejected() {
        String token = jwtService.generateAccessToken(UUID.randomUUID());
        String tampered = token.substring(0, token.length() - 2) + "xx";

        assertThatThrownBy(() -> jwtService.extractAccessUserId(tampered))
                .isInstanceOf(InvalidTokenException.class);
    }

    @Test
    void expiredTokenIsRejected() {
        JwtService expiredService = new JwtService(ACCESS_SECRET, REFRESH_SECRET, -1_000L, ONE_DAY);
        String token = expiredService.generateAccessToken(UUID.randomUUID());

        assertThatThrownBy(() -> expiredService.extractAccessUserId(token))
                .isInstanceOf(InvalidTokenException.class);
    }

    @Test
    void shortSecretIsRejectedAtStartup() {
        assertThatThrownBy(() -> new JwtService("too-short", REFRESH_SECRET, ONE_MINUTE, ONE_DAY))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void identicalSecretsAreRejectedAtStartup() {
        assertThatThrownBy(() -> new JwtService(ACCESS_SECRET, ACCESS_SECRET, ONE_MINUTE, ONE_DAY))
                .isInstanceOf(IllegalStateException.class);
    }
}
