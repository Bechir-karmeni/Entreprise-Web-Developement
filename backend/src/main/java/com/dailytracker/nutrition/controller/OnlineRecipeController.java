package com.dailytracker.nutrition.controller;

import com.dailytracker.nutrition.dto.GenerateOnlineRecipeRequest;
import com.dailytracker.nutrition.dto.OnlineRecipeFilters;
import com.dailytracker.nutrition.dto.OnlineRecipeOptions;
import com.dailytracker.nutrition.dto.OnlineRecipePage;
import com.dailytracker.nutrition.dto.OnlineRecipeShoppingRequest;
import com.dailytracker.nutrition.dto.SaveOnlineRecipeRequest;
import com.dailytracker.nutrition.dto.SavedOnlineRecipeResponse;
import com.dailytracker.nutrition.dto.ShoppingItemResponse;
import com.dailytracker.nutrition.external.OnlineRecipe;
import com.dailytracker.nutrition.service.OnlineRecipeService;
import jakarta.validation.Valid;
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

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/online-recipes")
public class OnlineRecipeController {

    private final OnlineRecipeService service;

    public OnlineRecipeController(OnlineRecipeService service) {
        this.service = service;
    }

    @GetMapping
    public OnlineRecipePage search(@RequestParam(name = "search", required = false) String search,
                                   @RequestParam(name = "category", required = false) String category,
                                   @RequestParam(name = "area", required = false) String area,
                                   @RequestParam(name = "page", defaultValue = "1") int page) {
        return service.search(new OnlineRecipeFilters(search, category, area), page);
    }

    /** Recipes that Gemini writes for the request, for example "high-protein vegetarian dinner". */
    @PostMapping("/generate")
    public List<OnlineRecipe> generate(@RequestBody GenerateOnlineRecipeRequest request) {
        return service.generate(request.request());
    }

    @GetMapping("/random")
    public OnlineRecipe random() {
        return service.random();
    }

    @GetMapping("/options")
    public OnlineRecipeOptions options() {
        return service.options();
    }

    @GetMapping("/saved")
    public List<SavedOnlineRecipeResponse> saved(@AuthenticationPrincipal UUID userId) {
        return service.saved(userId);
    }

    @PostMapping("/saved")
    @ResponseStatus(HttpStatus.CREATED)
    public SavedOnlineRecipeResponse save(@AuthenticationPrincipal UUID userId, @Valid @RequestBody SaveOnlineRecipeRequest request) {
        return service.save(userId, request.id());
    }

    @DeleteMapping("/saved/{savedId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void remove(@AuthenticationPrincipal UUID userId, @PathVariable UUID savedId) {
        service.remove(userId, savedId);
    }

    @GetMapping("/{id}")
    public OnlineRecipe detail(@PathVariable int id) {
        return service.detail(id);
    }

    @PostMapping("/{id}/shopping")
    @ResponseStatus(HttpStatus.CREATED)
    public List<ShoppingItemResponse> addToShopping(@AuthenticationPrincipal UUID userId, @PathVariable int id,
                                                    @RequestBody(required = false) OnlineRecipeShoppingRequest request) {
        return service.addToShopping(userId, id, request);
    }
}
