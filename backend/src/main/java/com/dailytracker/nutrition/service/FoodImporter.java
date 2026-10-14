package com.dailytracker.nutrition.service;

import com.dailytracker.nutrition.dto.FoodResponse;
import com.dailytracker.nutrition.entity.Food;
import com.dailytracker.nutrition.external.ExternalFood;
import com.dailytracker.nutrition.repository.FoodRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/** Saves online search results into the foods table (insert new, update existing). */
@Service
public class FoodImporter {

    private final FoodRepository foods;

    public FoodImporter(FoodRepository foods) {
        this.foods = foods;
    }

    @Transactional
    public List<FoodResponse> upsert(List<ExternalFood> items) {
        List<FoodResponse> result = new ArrayList<>();
        Set<String> seen = new HashSet<>();
        for (ExternalFood item : items) {
            if (!seen.add(item.source() + ":" + item.externalId())) {
                continue;
            }
            Food food = foods.findBySourceAndExternalId(item.source(), item.externalId())
                    .orElseGet(() -> new Food(item));
            food.updateFrom(item);
            Food saved = foods.save(food);
            result.add(FoodResponse.from(saved));
        }
        return result;
    }
}
