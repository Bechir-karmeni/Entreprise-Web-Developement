package com.dailytracker.nutrition.external;

/**
 * One recent shelf price for a product at one store, from Open Prices (Open Food Facts, ODbL licence).
 * Prices are community-reported and may be out of date.
 */
public record PriceOffer(
        String store,
        String brand,
        int priceCents,
        String date,
        boolean discounted,
        /** Name of the product the price was matched to, or null when the price came from a barcode lookup. */
        String product
) {
}
