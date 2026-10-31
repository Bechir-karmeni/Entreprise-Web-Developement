package com.dailytracker.nutrition.controller;

import com.dailytracker.nutrition.dto.ShoppingBudgetRequest;
import com.dailytracker.nutrition.dto.ShoppingBudgetResponse;
import com.dailytracker.nutrition.service.ShoppingBudgetService;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/shopping-budget")
public class ShoppingBudgetController {

    private final ShoppingBudgetService budgetService;

    public ShoppingBudgetController(ShoppingBudgetService budgetService) {
        this.budgetService = budgetService;
    }

    @GetMapping
    public ShoppingBudgetResponse get(@AuthenticationPrincipal UUID userId) {
        return budgetService.get(userId);
    }

    @PutMapping
    public ShoppingBudgetResponse set(@AuthenticationPrincipal UUID userId, @Valid @RequestBody ShoppingBudgetRequest request) {
        return budgetService.set(userId, request.amountCents());
    }
}
