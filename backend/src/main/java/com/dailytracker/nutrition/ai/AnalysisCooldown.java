package com.dailytracker.nutrition.ai;

import com.dailytracker.nutrition.exception.RateLimitedException;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Allows one AI request per user every ten minutes for each feature (analysis, daily coach, summary, copilot).
 * Each feature has its own timer, so using one does not block the others. Each call costs money, and a button
 * should not be usable to send requests in a loop. The timestamps are kept in memory, so they reset on restart.
 */
@Component
public class AnalysisCooldown {

    static final Duration COOLDOWN = Duration.ofMinutes(10);
    private static final String ANALYSIS = "analysis";

    private final Map<String, Map<UUID, Instant>> lastRun = new ConcurrentHashMap<>();
    private final Clock clock;

    public AnalysisCooldown(Clock clock) {
        this.clock = clock;
    }

    /** The 30-day analysis. */
    public void requireAllowed(UUID userId) {
        requireAllowed(userId, ANALYSIS);
    }

    public void requireAllowed(UUID userId, String feature) {
        requireAllowed(userId, feature, COOLDOWN, "You can request a new analysis in a few minutes.");
    }

    /** Same check with its own wait time and message, for features that are used more often (such as photo scans). */
    public void requireAllowed(UUID userId, String feature, Duration wait, String message) {
        Map<UUID, Instant> runs = lastRun.computeIfAbsent(feature, key -> new ConcurrentHashMap<>());
        Instant now = clock.instant();
        Instant last = runs.get(userId);
        if (last != null && Duration.between(last, now).compareTo(wait) < 0) {
            throw new RateLimitedException(message);
        }
        runs.put(userId, now);
    }
}
