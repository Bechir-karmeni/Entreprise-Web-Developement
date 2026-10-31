package com.dailytracker.nutrition.controller;

import com.dailytracker.nutrition.dto.ShoppingItemCategoryRequest;
import com.dailytracker.nutrition.dto.ShoppingItemPatch;
import com.dailytracker.nutrition.dto.ShoppingItemPriceRequest;
import com.dailytracker.nutrition.dto.ShoppingItemRequest;
import com.dailytracker.nutrition.dto.ShoppingItemResponse;
import com.dailytracker.nutrition.external.PriceOffer;
import com.dailytracker.nutrition.service.ShoppingListService;
import com.dailytracker.nutrition.service.ShoppingPriceService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/shopping-items")
public class ShoppingListController {

    private final ShoppingListService shoppingListService;
    private final ShoppingPriceService shoppingPriceService;

    public ShoppingListController(ShoppingListService shoppingListService, ShoppingPriceService shoppingPriceService) {
        this.shoppingListService = shoppingListService;
        this.shoppingPriceService = shoppingPriceService;
    }

    @GetMapping("/{id}/prices")
    public List<PriceOffer> prices(@AuthenticationPrincipal UUID userId, @PathVariable UUID id) {
        return shoppingPriceService.offers(userId, id);
    }

    @GetMapping
    public List<ShoppingItemResponse> list(@AuthenticationPrincipal UUID userId) {
        return shoppingListService.list(userId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ShoppingItemResponse add(@AuthenticationPrincipal UUID userId, @Valid @RequestBody ShoppingItemRequest request) {
        return shoppingListService.add(userId, request);
    }

    @PatchMapping("/{id}")
    public ShoppingItemResponse setChecked(
            @AuthenticationPrincipal UUID userId,
            @PathVariable UUID id,
            @Valid @RequestBody ShoppingItemPatch patch) {
        return shoppingListService.setChecked(userId, id, patch.checked());
    }

    @PatchMapping("/{id}/price")
    public ShoppingItemResponse setPrice(
            @AuthenticationPrincipal UUID userId,
            @PathVariable UUID id,
            @Valid @RequestBody ShoppingItemPriceRequest request) {
        return shoppingListService.setPrice(userId, id, request.priceCents());
    }

    @PatchMapping("/{id}/category")
    public ShoppingItemResponse setCategory(
            @AuthenticationPrincipal UUID userId,
            @PathVariable UUID id,
            @Valid @RequestBody ShoppingItemCategoryRequest request) {
        return shoppingListService.setCategory(userId, id, request.category());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal UUID userId, @PathVariable UUID id) {
        shoppingListService.delete(userId, id);
    }
}
