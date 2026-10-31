package com.dailytracker.nutrition.controller;

import com.dailytracker.nutrition.dto.FridgeRecommendation;
import com.dailytracker.nutrition.dto.PromptRequest;
import com.dailytracker.nutrition.dto.RecommendationResponse;
import com.dailytracker.nutrition.service.RecommendationService;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/recommendations")
public class RecommendationController {

    private final RecommendationService recommendations;

    public RecommendationController(RecommendationService recommendations) {
        this.recommendations = recommendations;
    }

    @PostMapping("/prompt")
    public RecommendationResponse prompt(@Valid @RequestBody PromptRequest request) {
        return recommendations.fromPrompt(request.text());
    }

    @GetMapping("/fridge")
    public FridgeRecommendation fridge(@AuthenticationPrincipal UUID userId) {
        return recommendations.fromFridge(userId);
    }
}
