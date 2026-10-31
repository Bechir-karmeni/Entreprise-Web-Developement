package com.dailytracker.nutrition.controller;

import com.dailytracker.nutrition.dto.AnalysisRequest;
import com.dailytracker.nutrition.dto.AnalysisResponse;
import com.dailytracker.nutrition.service.SummaryService;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/summary")
public class SummaryController {

    private final SummaryService summaryService;

    public SummaryController(SummaryService summaryService) {
        this.summaryService = summaryService;
    }

    /** A short summary of the last 7 days, written in the given language. */
    @PostMapping
    public AnalysisResponse summarise(@AuthenticationPrincipal UUID userId, @Valid @RequestBody AnalysisRequest request) {
        return summaryService.summarise(userId, request.language());
    }
}
