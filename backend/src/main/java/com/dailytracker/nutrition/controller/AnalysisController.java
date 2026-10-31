package com.dailytracker.nutrition.controller;

import com.dailytracker.nutrition.dto.AnalysisRequest;
import com.dailytracker.nutrition.dto.AnalysisResponse;
import com.dailytracker.nutrition.service.AnalysisService;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/analysis")
public class AnalysisController {

    private final AnalysisService analysisService;

    public AnalysisController(AnalysisService analysisService) {
        this.analysisService = analysisService;
    }

    /** Analyses the last 30 days of the user's food, water and weight with the Claude API. */
    @PostMapping
    public AnalysisResponse analyse(@AuthenticationPrincipal UUID userId, @Valid @RequestBody AnalysisRequest request) {
        return analysisService.analyse(userId, request.language());
    }
}
