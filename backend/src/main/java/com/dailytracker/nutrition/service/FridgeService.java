package com.dailytracker.nutrition.service;

import com.dailytracker.nutrition.dto.FridgeItemResponse;
import com.dailytracker.nutrition.entity.FridgeItem;
import com.dailytracker.nutrition.exception.InvalidRequestException;
import com.dailytracker.nutrition.exception.ResourceNotFoundException;
import com.dailytracker.nutrition.repository.FridgeItemRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
import java.util.UUID;

/** The items the user has in the fridge. Names are stored lowercase and each name appears once per user. */
@Service
public class FridgeService {

    private static final int MAX_NAME = 100;

    private final FridgeItemRepository items;

    public FridgeService(FridgeItemRepository items) {
        this.items = items;
    }

    @Transactional(readOnly = true)
    public List<FridgeItemResponse> list(UUID userId) {
        return items.findByUserIdOrderByNameAsc(userId).stream()
                .map(item -> new FridgeItemResponse(item.getId(), item.getName()))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<String> names(UUID userId) {
        return items.findByUserIdOrderByNameAsc(userId).stream().map(FridgeItem::getName).toList();
    }

    /** Adds an item. Adding a name that is already there returns the existing item. */
    @Transactional
    public FridgeItemResponse add(UUID userId, String name) {
        String normalized = name == null ? "" : name.trim().toLowerCase(Locale.ROOT);
        if (normalized.isEmpty()) {
            throw new InvalidRequestException("Type an item name.");
        }
        if (normalized.length() > MAX_NAME) {
            throw new InvalidRequestException("An item name can be at most 100 characters.");
        }
        FridgeItem item = items.findByUserIdAndName(userId, normalized)
                .orElseGet(() -> items.save(new FridgeItem(userId, normalized)));
        return new FridgeItemResponse(item.getId(), item.getName());
    }

    @Transactional
    public void remove(UUID userId, UUID id) {
        FridgeItem item = items.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Fridge item not found."));
        items.delete(item);
    }
}
