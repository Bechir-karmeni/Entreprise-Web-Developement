package com.dailytracker.nutrition.dto;

import com.dailytracker.nutrition.entity.ShoppingItem;
import com.dailytracker.nutrition.shopping.ShoppingCategory;

import java.util.UUID;

public record ShoppingItemResponse(
        UUID id,
        String name,
        String quantity,
        ShoppingCategory category,
        boolean checked
) {
    public static ShoppingItemResponse from(ShoppingItem item) {
        return new ShoppingItemResponse(
                item.getId(),
                item.getName(),
                item.getQuantity(),
                item.getCategory(),
                item.isChecked());
    }
}
