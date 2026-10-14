package com.dailytracker.nutrition.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.dailytracker.nutrition.dto.ProfileRequest;
import com.dailytracker.nutrition.dto.ProfileResponse;
import com.dailytracker.nutrition.dto.TargetsResponse;
import com.dailytracker.nutrition.entity.UserProfile;
import com.dailytracker.nutrition.exception.ResourceNotFoundException;
import com.dailytracker.nutrition.nutrition.ActivityLevel;
import com.dailytracker.nutrition.nutrition.NutritionGoal;
import com.dailytracker.nutrition.nutrition.NutritionSettings;
import com.dailytracker.nutrition.nutrition.NutritionTargetCalculator;
import com.dailytracker.nutrition.nutrition.Sex;
import com.dailytracker.nutrition.repository.UserProfileRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ProfileServiceTest {

    @Mock
    private UserProfileRepository profiles;

    private final Clock clock = Clock.fixed(Instant.parse("2026-10-08T12:00:00Z"), ZoneOffset.UTC);

    private ProfileService service() {
        return new ProfileService(profiles, new NutritionTargetCalculator(NutritionSettings.defaults()), clock);
    }

    @Test
    void savesNewProfileForUser() {
        UUID userId = UUID.randomUUID();
        when(profiles.findById(userId)).thenReturn(Optional.empty());
        when(profiles.save(any(UserProfile.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ProfileRequest request = new ProfileRequest(Sex.MALE, LocalDate.of(1996, 10, 8), 180.0, 80.0,
                ActivityLevel.MODERATELY_ACTIVE, NutritionGoal.MAINTAIN_WEIGHT);

        ProfileResponse response = service().save(userId, request);

        assertEquals(Sex.MALE, response.sex());
        assertEquals(80.0, response.weightKg());
    }

    @Test
    void calculatesTargetsFromStoredProfile() {
        UUID userId = UUID.randomUUID();
        UserProfile stored = new UserProfile(userId);
        stored.update(Sex.MALE, LocalDate.of(1996, 10, 8), 180, 80,
                ActivityLevel.MODERATELY_ACTIVE, NutritionGoal.MAINTAIN_WEIGHT);
        when(profiles.findById(userId)).thenReturn(Optional.of(stored));

        TargetsResponse targets = service().getTargets(userId);

        assertEquals(2759, targets.calories());
        assertEquals(128, targets.proteinGrams());
        assertEquals(TargetsResponse.DISCLAIMER, targets.disclaimer());
    }

    @Test
    void reportsMissingProfile() {
        UUID userId = UUID.randomUUID();
        when(profiles.findById(userId)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> service().getTargets(userId));
    }
}
