package com.dailytracker.nutrition.dto;

import com.dailytracker.nutrition.shopping.ShoppingCategory;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ShoppingItemRequest(
        @NotBlank @Size(max = 100) String name,
        @Size(max = 40) String quantity,
        @NotNull ShoppingCategory category
) {
}
