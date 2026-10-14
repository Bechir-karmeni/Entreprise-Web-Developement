package com.dailytracker.nutrition.service;

import com.dailytracker.nutrition.dto.ShoppingItemRequest;
import com.dailytracker.nutrition.dto.ShoppingItemResponse;
import com.dailytracker.nutrition.entity.ShoppingItem;
import com.dailytracker.nutrition.exception.ResourceNotFoundException;
import com.dailytracker.nutrition.repository.ShoppingItemRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class ShoppingListService {

    private final ShoppingItemRepository items;

    public ShoppingListService(ShoppingItemRepository items) {
        this.items = items;
    }

    @Transactional(readOnly = true)
    public List<ShoppingItemResponse> list(UUID userId) {
        return items.findByUserIdOrderByCreatedAtAsc(userId).stream().map(ShoppingItemResponse::from).toList();
    }

    @Transactional
    public ShoppingItemResponse add(UUID userId, ShoppingItemRequest request) {
        String quantity = request.quantity() == null ? "" : request.quantity().trim();
        ShoppingItem item = new ShoppingItem(userId, request.name().trim(), quantity, request.category());
        return ShoppingItemResponse.from(items.save(item));
    }

    @Transactional
    public ShoppingItemResponse setChecked(UUID userId, UUID id, boolean checked) {
        ShoppingItem item = find(userId, id);
        item.setChecked(checked);
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
}
