package com.dailytracker.nutrition.service;

import com.dailytracker.nutrition.entity.ShoppingItem;
import com.dailytracker.nutrition.exception.ResourceNotFoundException;
import com.dailytracker.nutrition.external.OpenPricesClient;
import com.dailytracker.nutrition.external.OpenPricesClient.PriceProduct;
import com.dailytracker.nutrition.external.PriceOffer;
import com.dailytracker.nutrition.repository.ShoppingItemRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Finds recent store prices for a shopping item. An item with a barcode is matched exactly. A hand-typed item is
 * matched by name: Open Prices products with that name are found, and the prices of their barcodes are merged.
 */
@Service
public class ShoppingPriceService {

    private static final Pattern BARCODE = Pattern.compile("\\d{6,14}");
    private static final int MAX_PRODUCTS = 3;
    private static final int MAX_OFFERS = 8;

    private final ShoppingItemRepository items;
    private final OpenPricesClient openPrices;

    public ShoppingPriceService(ShoppingItemRepository items, OpenPricesClient openPrices) {
        this.items = items;
        this.openPrices = openPrices;
    }

    @Transactional(readOnly = true)
    public List<PriceOffer> offers(UUID userId, UUID id) {
        ShoppingItem item = items.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Shopping item not found."));
        if (item.getBarcode() != null) {
            return openPrices.offersFor(item.getBarcode());
        }

        List<PriceProduct> products = openPrices.productsNamed(item.getName()).stream()
                .filter(product -> BARCODE.matcher(product.code()).matches())
                .limit(MAX_PRODUCTS)
                .toList();

        List<PriceOffer> offers = new ArrayList<>();
        for (PriceProduct product : products) {
            for (PriceOffer offer : openPrices.offersFor(product.code())) {
                offers.add(new PriceOffer(
                        offer.store(), offer.brand(), offer.priceCents(), offer.date(), offer.discounted(),
                        product.name()));
            }
        }
        return offers.stream()
                .sorted(Comparator.comparingInt(PriceOffer::priceCents))
                .limit(MAX_OFFERS)
                .toList();
    }
}
