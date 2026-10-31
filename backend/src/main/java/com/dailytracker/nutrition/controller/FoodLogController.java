package com.dailytracker.nutrition.controller;

import com.dailytracker.nutrition.dto.AmountUpdateRequest;
import com.dailytracker.nutrition.dto.DailyTotalResponse;
import com.dailytracker.nutrition.dto.DayLogResponse;
import com.dailytracker.nutrition.dto.FoodLogEntryResponse;
import com.dailytracker.nutrition.dto.FoodLogRequest;
import com.dailytracker.nutrition.dto.QuickEntryRequest;
import com.dailytracker.nutrition.service.FoodLogService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/food-log")
public class FoodLogController {

    private final FoodLogService foodLogService;

    public FoodLogController(FoodLogService foodLogService) {
        this.foodLogService = foodLogService;
    }

    @GetMapping
    public DayLogResponse day(
            @AuthenticationPrincipal UUID userId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return foodLogService.day(userId, date);
    }

    /** Totals per day for a date range (at most one year). Used by the progress page. */
    @GetMapping("/range")
    public List<DailyTotalResponse> range(
            @AuthenticationPrincipal UUID userId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return foodLogService.dailyTotals(userId, from, to);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public FoodLogEntryResponse add(@AuthenticationPrincipal UUID userId, @Valid @RequestBody FoodLogRequest request) {
        return foodLogService.add(userId, request);
    }

    @PostMapping("/quick")
    @ResponseStatus(HttpStatus.CREATED)
    public FoodLogEntryResponse addQuick(@AuthenticationPrincipal UUID userId, @Valid @RequestBody QuickEntryRequest request) {
        return foodLogService.addQuick(userId, request);
    }

    @PatchMapping("/{id}")
    public FoodLogEntryResponse updateAmount(@AuthenticationPrincipal UUID userId, @PathVariable UUID id,
                                             @Valid @RequestBody AmountUpdateRequest request) {
        return foodLogService.updateAmount(userId, id, request.amount());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal UUID userId, @PathVariable UUID id) {
        foodLogService.delete(userId, id);
    }
}
