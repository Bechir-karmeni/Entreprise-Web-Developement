package com.dailytracker.nutrition.controller;

import com.dailytracker.nutrition.dto.FoodPhotoItem;
import com.dailytracker.nutrition.dto.FoodPhotoRequest;
import com.dailytracker.nutrition.service.FoodPhotoService;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/food-photo")
public class FoodPhotoController {

    private final FoodPhotoService photos;

    public FoodPhotoController(FoodPhotoService photos) {
        this.photos = photos;
    }

    /** Finds the foods in a meal photo and estimates their nutrition. Nothing is saved. */
    @PostMapping("/analyse")
    public List<FoodPhotoItem> analyse(@AuthenticationPrincipal UUID userId, @Valid @RequestBody FoodPhotoRequest request) {
        return photos.analyse(userId, request);
    }
}
