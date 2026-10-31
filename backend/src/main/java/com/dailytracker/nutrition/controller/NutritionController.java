package com.dailytracker.nutrition.controller;

import com.dailytracker.nutrition.dto.MacrosResponse;
import com.dailytracker.nutrition.service.NutritionLookupService;
import com.dailytracker.nutrition.service.NutritionLookupService.Macros;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/nutrition")
public class NutritionController {

    private final NutritionLookupService lookup;

    public NutritionController(NutritionLookupService lookup) {
        this.lookup = lookup;
    }

    @GetMapping("/macros")
    public MacrosResponse macros(@RequestParam("name") String name) {
        Macros macros = lookup.lookup(name);
        return new MacrosResponse(macros.matchedName(), macros.calories(), macros.proteinG(), macros.carbsG(), macros.fatG());
    }
}
