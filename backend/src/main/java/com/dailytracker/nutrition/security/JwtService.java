package com.dailytracker.nutrition.security;

import com.dailytracker.nutrition.exception.InvalidTokenException;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

/**
 * Issues and validates JSON Web Tokens.
 * Access and refresh tokens use different secrets and carry a "type" claim,
 * so a refresh token cannot be used as an access token and vice versa.
 */
@Service
public class JwtService {

    private static final String TYPE_CLAIM = "type";
    private static final String ACCESS = "access";
    private static final String REFRESH = "refresh";
    private static final int MIN_SECRET_BYTES = 32;

    private final SecretKey accessKey;
    private final SecretKey refreshKey;
    private final long accessExpirationMs;
    private final long refreshExpirationMs;

    public JwtService(
            @Value("${app.security.jwt-secret}") String accessSecret,
            @Value("${app.security.refresh-token-secret}") String refreshSecret,
            @Value("${app.security.jwt-expiration-ms}") long accessExpirationMs,
            @Value("${app.security.refresh-token-expiration-ms}") long refreshExpirationMs) {
        if (accessSecret.equals(refreshSecret)) {
            throw new IllegalStateException("JWT_SECRET and REFRESH_TOKEN_SECRET must be different");
        }
        this.accessKey = toKey(accessSecret, "JWT_SECRET");
        this.refreshKey = toKey(refreshSecret, "REFRESH_TOKEN_SECRET");
        this.accessExpirationMs = accessExpirationMs;
        this.refreshExpirationMs = refreshExpirationMs;
    }

    public String generateAccessToken(UUID userId) {
        return build(userId, ACCESS, accessKey, accessExpirationMs);
    }

    public String generateRefreshToken(UUID userId) {
        return build(userId, REFRESH, refreshKey, refreshExpirationMs);
    }

    public UUID extractAccessUserId(String token) {
        return UUID.fromString(parse(token, accessKey, ACCESS).getSubject());
    }

    public UUID extractRefreshUserId(String token) {
        return UUID.fromString(parse(token, refreshKey, REFRESH).getSubject());
    }

    public long getAccessExpirationSeconds() {
        return accessExpirationMs / 1000;
    }

    private String build(UUID userId, String type, SecretKey key, long ttlMs) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(userId.toString())
                .claim(TYPE_CLAIM, type)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusMillis(ttlMs)))
                .signWith(key)
                .compact();
    }

    private Claims parse(String token, SecretKey key, String expectedType) {
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(key)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
            if (!expectedType.equals(claims.get(TYPE_CLAIM, String.class))) {
                throw new InvalidTokenException("Invalid or expired token.");
            }
            return claims;
        } catch (JwtException | IllegalArgumentException ex) {
            // Covers bad signature, malformed token, expired token and an empty token.
            throw new InvalidTokenException("Invalid or expired token.");
        }
    }

    private static SecretKey toKey(String secret, String variableName) {
        if (secret == null || secret.getBytes(StandardCharsets.UTF_8).length < MIN_SECRET_BYTES) {
            throw new IllegalStateException(variableName + " must be at least " + MIN_SECRET_BYTES + " bytes long");
        }
        return Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }
}
