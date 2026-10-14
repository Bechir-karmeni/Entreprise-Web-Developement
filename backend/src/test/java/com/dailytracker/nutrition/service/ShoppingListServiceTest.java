package com.dailytracker.nutrition.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.dailytracker.nutrition.dto.ShoppingItemRequest;
import com.dailytracker.nutrition.dto.ShoppingItemResponse;
import com.dailytracker.nutrition.entity.ShoppingItem;
import com.dailytracker.nutrition.exception.ResourceNotFoundException;
import com.dailytracker.nutrition.repository.ShoppingItemRepository;
import com.dailytracker.nutrition.shopping.ShoppingCategory;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ShoppingListServiceTest {

    private static final UUID USER = UUID.randomUUID();

    @Mock
    private ShoppingItemRepository items;

    @Test
    void addTrimsTheNameAndStartsUnchecked() {
        when(items.save(any(ShoppingItem.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ShoppingItemResponse saved = new ShoppingListService(items)
                .add(USER, new ShoppingItemRequest("  Greek yogurt ", " 500 g ", ShoppingCategory.DAIRY));

        assertEquals("Greek yogurt", saved.name());
        assertEquals("500 g", saved.quantity());
        assertFalse(saved.checked());
    }

    @Test
    void checkingAnItemUpdatesIt() {
        ShoppingItem item = new ShoppingItem(USER, "Eggs", "12", ShoppingCategory.PROTEIN);
        when(items.findByIdAndUserId(item.getId(), USER)).thenReturn(Optional.of(item));
        when(items.save(any(ShoppingItem.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ShoppingItemResponse updated = new ShoppingListService(items).setChecked(USER, item.getId(), true);

        assertEquals(true, updated.checked());
    }

    @Test
    void anotherUsersItemIsNotFound() {
        UUID id = UUID.randomUUID();
        when(items.findByIdAndUserId(id, USER)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> new ShoppingListService(items).setChecked(USER, id, true));
    }
}
