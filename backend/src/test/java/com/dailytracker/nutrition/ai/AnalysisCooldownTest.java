package com.dailytracker.nutrition.ai;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;

import com.dailytracker.nutrition.exception.RateLimitedException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class AnalysisCooldownTest {

    @Test
    void allowsOneAnalysisEveryTenMinutesPerUser() {
        MutableClock clock = new MutableClock(Instant.parse("2026-10-25T10:00:00Z"));
        AnalysisCooldown cooldown = new AnalysisCooldown(clock);
        UUID user = UUID.randomUUID();

        assertDoesNotThrow(() -> cooldown.requireAllowed(user));

        clock.advance(Duration.ofMinutes(5));
        assertThrows(RateLimitedException.class, () -> cooldown.requireAllowed(user));

        clock.advance(Duration.ofMinutes(6));
        assertDoesNotThrow(() -> cooldown.requireAllowed(user));
    }

    @Test
    void oneUsersAnalysisDoesNotBlockAnother() {
        AnalysisCooldown cooldown = new AnalysisCooldown(new MutableClock(Instant.parse("2026-10-25T10:00:00Z")));

        assertDoesNotThrow(() -> cooldown.requireAllowed(UUID.randomUUID()));
        assertDoesNotThrow(() -> cooldown.requireAllowed(UUID.randomUUID()));
    }

    @Test
    void eachFeatureHasItsOwnTimer() {
        AnalysisCooldown cooldown = new AnalysisCooldown(new MutableClock(Instant.parse("2026-10-25T10:00:00Z")));
        UUID user = UUID.randomUUID();

        assertDoesNotThrow(() -> cooldown.requireAllowed(user, "copilot"));
        assertDoesNotThrow(() -> cooldown.requireAllowed(user, "coach"));
        assertThrows(RateLimitedException.class, () -> cooldown.requireAllowed(user, "copilot"));
    }

    /** A clock whose time the test can move forward. */
    private static final class MutableClock extends Clock {
        private Instant now;

        MutableClock(Instant now) {
            this.now = now;
        }

        void advance(Duration duration) {
            now = now.plus(duration);
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return now;
        }
    }
}
