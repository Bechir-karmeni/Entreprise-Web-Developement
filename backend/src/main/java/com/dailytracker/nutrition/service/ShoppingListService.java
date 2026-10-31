package com.dailytracker.nutrition.service;

import com.dailytracker.nutrition.dto.ShoppingItemRequest;
import com.dailytracker.nutrition.dto.ShoppingItemResponse;
import com.dailytracker.nutrition.entity.ShoppingItem;
import com.dailytracker.nutrition.exception.ExternalServiceUnavailableException;
import com.dailytracker.nutrition.exception.ResourceNotFoundException;
import com.dailytracker.nutrition.external.OpenPricesClient;
import com.dailytracker.nutrition.repository.ShoppingItemRepository;
import com.dailytracker.nutrition.shopping.ShoppingCategory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class ShoppingListService {

    private final ShoppingItemRepository items;
    private final OpenPricesClient openPrices;

    public ShoppingListService(ShoppingItemRepository items, OpenPricesClient openPrices) {
        this.items = items;
        this.openPrices = openPrices;
    }

    @Transactional(readOnly = true)
    public List<ShoppingItemResponse> list(UUID userId) {
        return items.findByUserIdOrderByCreatedAtAsc(userId).stream().map(ShoppingItemResponse::from).toList();
    }

    @Transactional
    public ShoppingItemResponse add(UUID userId, ShoppingItemRequest request) {
        String quantity = request.quantity() == null ? "" : request.quantity().trim();
        ShoppingItem item = new ShoppingItem(userId, request.name().trim(), quantity, request.category());
        String barcode = request.barcode() == null ? "" : request.barcode().trim();
        item.setBarcode(barcode.isEmpty() ? null : barcode);
        applyCheapestPrice(item);
        return ShoppingItemResponse.from(items.save(item));
    }

    @Transactional
    public ShoppingItemResponse setChecked(UUID userId, UUID id, boolean checked) {
        ShoppingItem item = find(userId, id);
        item.setChecked(checked);
        return ShoppingItemResponse.from(items.save(item));
    }

    /** Sets the price of one item in cents, or removes it when the price is null. */
    @Transactional
    public ShoppingItemResponse setPrice(UUID userId, UUID id, Integer priceCents) {
        ShoppingItem item = find(userId, id);
        item.setPriceCents(priceCents);
        return ShoppingItemResponse.from(items.save(item));
    }

    /** Moves one item to another shopping category. */
    @Transactional
    public ShoppingItemResponse setCategory(UUID userId, UUID id, ShoppingCategory category) {
        ShoppingItem item = find(userId, id);
        item.setCategory(category);
        return ShoppingItemResponse.from(items.save(item));
    }

    @Transactional
    public void delete(UUID userId, UUID id) {
        items.delete(find(userId, id));
    }

    private ShoppingItem find(UUID userId, UUID id) {
        return items.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Shopping item not found."));
    }

    /**
     * Items with a barcode get the cheapest recent price known for it. Prices are optional, so when the
     * price service is unreachable the item is still saved without one.
     */
    private void applyCheapestPrice(ShoppingItem item) {
        if (item.getBarcode() == null) {
            return;
        }
        try {
            openPrices.offersFor(item.getBarcode()).stream()
                    .findFirst()
                    .ifPresent(offer -> item.setPriceCents(offer.priceCents()));
        } catch (ExternalServiceUnavailableException e) {
            // Saved without a price; the Prices button can still be used later.
        }
    }
}
