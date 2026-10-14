package com.dailytracker.nutrition.controller;

import com.dailytracker.nutrition.dto.ProfileRequest;
import com.dailytracker.nutrition.dto.ProfileResponse;
import com.dailytracker.nutrition.dto.TargetsResponse;
import com.dailytracker.nutrition.service.ProfileService;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/profile")
public class ProfileController {

    private final ProfileService profileService;

    public ProfileController(ProfileService profileService) {
        this.profileService = profileService;
    }

    @GetMapping
    public ProfileResponse get(@AuthenticationPrincipal UUID userId) {
        return profileService.getProfile(userId);
    }

    @PutMapping
    public ProfileResponse save(@AuthenticationPrincipal UUID userId, @Valid @RequestBody ProfileRequest request) {
        return profileService.save(userId, request);
    }

    @GetMapping("/targets")
    public TargetsResponse targets(@AuthenticationPrincipal UUID userId) {
        return profileService.getTargets(userId);
    }
}
