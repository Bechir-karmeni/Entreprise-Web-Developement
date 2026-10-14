package com.dailytracker.nutrition.dto;

import com.dailytracker.nutrition.food.Allergen;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.util.Set;

/** A food the user adds. All nutrient values are per one serving (servingSize in servingUnit). */
public record CustomFoodRequest(
        @NotBlank @Size(max = 150) String name,
        @Size(max = 150) String brand,
        @Positive @DecimalMax("5000") double servingSize,
        @NotBlank @Pattern(regexp = "g|ml|piece") String servingUnit,
        @Min(0) @Max(5000) int calories,
        @DecimalMin("0") @DecimalMax("1000") double proteinGrams,
        @DecimalMin("0") @DecimalMax("1000") double carbsGrams,
        @DecimalMin("0") @DecimalMax("1000") double fatGrams,
        @DecimalMin("0") @DecimalMax("1000") double fiberGrams,
        Set<Allergen> allergens
) {
}
