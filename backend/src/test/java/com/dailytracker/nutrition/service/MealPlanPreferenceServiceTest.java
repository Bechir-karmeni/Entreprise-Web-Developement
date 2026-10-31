package com.dailytracker.nutrition.service;

import com.dailytracker.nutrition.dto.MealPlanPreferences;
import com.dailytracker.nutrition.entity.MealPlanPreference;
import com.dailytracker.nutrition.repository.MealPlanPreferenceRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MealPlanPreferenceServiceTest {

    @Mock
    private MealPlanPreferenceRepository repository;

    private MealPlanPreferenceService service;

    @Test
    void returnsDefaultsWhenNothingWasSaved() {
        service = new MealPlanPreferenceService(repository);
        UUID userId = UUID.randomUUID();
        when(repository.findById(userId)).thenReturn(Optional.empty());

        assertThat(service.get(userId)).isEqualTo(MealPlanPreferences.defaults());
    }

    @Test
    void savingTrimsExcludedFoodsAndKeepsTheAnswers() {
        service = new MealPlanPreferenceService(repository);
        UUID userId = UUID.randomUUID();
        when(repository.findById(userId)).thenReturn(Optional.empty());

        MealPlanPreferences saved = service.save(userId,
                new MealPlanPreferences(true, "NONE", false, true, true, false, "  mushrooms ", 4));

        assertThat(saved.excludedFoods()).isEqualTo("mushrooms");
        assertThat(saved.dairy()).isEqualTo("NONE");
        assertThat(saved.mealsPerDay()).isEqualTo(4);
        verify(repository).save(any(MealPlanPreference.class));
    }
}
