package com.dailytracker.nutrition.dto;

import com.dailytracker.nutrition.entity.ShoppingItem;
import com.dailytracker.nutrition.shopping.ShoppingCategory;

import java.util.UUID;

public record ShoppingItemResponse(
        UUID id,
        String name,
        String quantity,
        ShoppingCategory category,
        boolean checked,
        /** Price in cents, or null when no price was entered. */
        Integer priceCents,
        /** Barcode digits, or null for hand-typed items. */
        String barcode
) {
    public static ShoppingItemResponse from(ShoppingItem item) {
        return new ShoppingItemResponse(
                item.getId(),
                item.getName(),
                item.getQuantity(),
                item.getCategory(),
                item.isChecked(),
                item.getPriceCents(),
                item.getBarcode());
    }
}
