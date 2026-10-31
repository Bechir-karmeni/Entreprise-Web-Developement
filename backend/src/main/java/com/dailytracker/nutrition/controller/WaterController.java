package com.dailytracker.nutrition.controller;

import com.dailytracker.nutrition.dto.WaterDayResponse;
import com.dailytracker.nutrition.dto.WaterIntakeRequest;
import com.dailytracker.nutrition.service.WaterService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.UUID;

@RestController
@RequestMapping("/api/water")
public class WaterController {

    private final WaterService waterService;

    public WaterController(WaterService waterService) {
        this.waterService = waterService;
    }

    @GetMapping
    public WaterDayResponse day(
            @AuthenticationPrincipal UUID userId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return waterService.day(userId, date);
    }

    /** Adds one drink and returns the updated day. */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public WaterDayResponse add(@AuthenticationPrincipal UUID userId, @Valid @RequestBody WaterIntakeRequest request) {
        return waterService.add(userId, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal UUID userId, @PathVariable UUID id) {
        waterService.delete(userId, id);
    }
}
