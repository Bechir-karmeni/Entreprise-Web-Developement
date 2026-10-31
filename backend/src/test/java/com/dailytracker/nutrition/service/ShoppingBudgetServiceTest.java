package com.dailytracker.nutrition.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.dailytracker.nutrition.dto.ShoppingBudgetResponse;
import com.dailytracker.nutrition.entity.ShoppingBudget;
import com.dailytracker.nutrition.repository.ShoppingBudgetRepository;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ShoppingBudgetServiceTest {

    private static final UUID USER = UUID.randomUUID();

    @Mock
    private ShoppingBudgetRepository budgets;

    @InjectMocks
    private ShoppingBudgetService service;

    @Test
    void setStoresTheBudgetInCents() {
        when(budgets.findById(USER)).thenReturn(Optional.empty());

        ShoppingBudgetResponse result = service.set(USER, 15000);

        assertEquals(15000, result.amountCents());
        verify(budgets).save(any(ShoppingBudget.class));
    }

    @Test
    void nullRemovesTheBudget() {
        ShoppingBudget existing = new ShoppingBudget(USER, 15000);
        when(budgets.findById(USER)).thenReturn(Optional.of(existing));

        ShoppingBudgetResponse result = service.set(USER, null);

        assertNull(result.amountCents());
        verify(budgets).delete(existing);
    }
}
