package com.dailytracker.nutrition.controller;

import com.dailytracker.nutrition.dto.FridgeItemRequest;
import com.dailytracker.nutrition.dto.FridgeItemResponse;
import com.dailytracker.nutrition.service.FridgeService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/fridge")
public class FridgeController {

    private final FridgeService fridge;

    public FridgeController(FridgeService fridge) {
        this.fridge = fridge;
    }

    @GetMapping
    public List<FridgeItemResponse> list(@AuthenticationPrincipal UUID userId) {
        return fridge.list(userId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public FridgeItemResponse add(@AuthenticationPrincipal UUID userId, @Valid @RequestBody FridgeItemRequest request) {
        return fridge.add(userId, request.name());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void remove(@AuthenticationPrincipal UUID userId, @PathVariable UUID id) {
        fridge.remove(userId, id);
    }
}
