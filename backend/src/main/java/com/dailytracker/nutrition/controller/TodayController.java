package com.dailytracker.nutrition.controller;

import com.dailytracker.nutrition.dto.TodayCoachRequest;
import com.dailytracker.nutrition.dto.TodayCoachResponse;
import com.dailytracker.nutrition.dto.TodayResponse;
import com.dailytracker.nutrition.service.TodayCoachService;
import com.dailytracker.nutrition.service.TodayService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.UUID;

@RestController
@RequestMapping("/api/today")
public class TodayController {

    private final TodayService todayService;
    private final TodayCoachService coachService;

    public TodayController(TodayService todayService, TodayCoachService coachService) {
        this.todayService = todayService;
        this.coachService = coachService;
    }

    /** One call for the whole Today page. Without a date, returns today. */
    @GetMapping
    public TodayResponse today(
            @AuthenticationPrincipal UUID userId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return todayService.today(userId, date);
    }

    /** A short AI note about one day. Uses the Claude API, so it is limited by the analysis cooldown. */
    @PostMapping("/coach")
    public TodayCoachResponse coach(@AuthenticationPrincipal UUID userId, @Valid @RequestBody TodayCoachRequest request) {
        return coachService.coach(userId, request.date(), request.language());
    }
}
