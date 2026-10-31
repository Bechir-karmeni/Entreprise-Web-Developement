package com.dailytracker.nutrition.controller;

import com.dailytracker.nutrition.dto.MealPlanPreferences;
import com.dailytracker.nutrition.service.MealPlanPreferenceService;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/meal-plan/preferences")
public class MealPlanPreferenceController {

    private final MealPlanPreferenceService service;

    public MealPlanPreferenceController(MealPlanPreferenceService service) {
        this.service = service;
    }

    @GetMapping
    public MealPlanPreferences get(@AuthenticationPrincipal UUID userId) {
        return service.get(userId);
    }

    @PutMapping
    public MealPlanPreferences save(@AuthenticationPrincipal UUID userId, @Valid @RequestBody MealPlanPreferences request) {
        return service.save(userId, request);
    }
}
