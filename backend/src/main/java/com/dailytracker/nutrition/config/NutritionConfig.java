package com.dailytracker.nutrition.config;

import com.dailytracker.nutrition.nutrition.NutritionSettings;
import com.dailytracker.nutrition.nutrition.NutritionTargetCalculator;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;

@Configuration
public class NutritionConfig {

    /** Default formula settings. They can be moved to application.yml in a later step. */
    @Bean
    NutritionTargetCalculator nutritionTargetCalculator() {
        return new NutritionTargetCalculator(NutritionSettings.defaults());
    }

    /** Clock used to derive age from the date of birth; replaceable in tests. */
    @Bean
    Clock clock() {
        return Clock.systemDefaultZone();
    }
}
