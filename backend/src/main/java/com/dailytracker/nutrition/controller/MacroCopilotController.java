package com.dailytracker.nutrition.controller;

import com.dailytracker.nutrition.dto.AnalysisRequest;
import com.dailytracker.nutrition.dto.AnalysisResponse;
import com.dailytracker.nutrition.service.MacroCopilotService;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/copilot")
public class MacroCopilotController {

    private final MacroCopilotService copilot;

    public MacroCopilotController(MacroCopilotService copilot) {
        this.copilot = copilot;
    }

    /** Macro guidance based on the last 14 days, written in the given language. */
    @PostMapping("/macros")
    public AnalysisResponse macros(@AuthenticationPrincipal UUID userId, @Valid @RequestBody AnalysisRequest request) {
        return copilot.guidance(userId, request.language());
    }
}
