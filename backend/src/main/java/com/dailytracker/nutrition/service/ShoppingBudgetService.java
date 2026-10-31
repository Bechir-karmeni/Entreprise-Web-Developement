package com.dailytracker.nutrition.service;

import com.dailytracker.nutrition.dto.ShoppingBudgetResponse;
import com.dailytracker.nutrition.entity.ShoppingBudget;
import com.dailytracker.nutrition.repository.ShoppingBudgetRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class ShoppingBudgetService {

    private final ShoppingBudgetRepository budgets;

    public ShoppingBudgetService(ShoppingBudgetRepository budgets) {
        this.budgets = budgets;
    }

    @Transactional(readOnly = true)
    public ShoppingBudgetResponse get(UUID userId) {
        return new ShoppingBudgetResponse(budgets.findById(userId).map(ShoppingBudget::getAmountCents).orElse(null));
    }

    /** Sets the budget, or removes it when the amount is null. */
    @Transactional
    public ShoppingBudgetResponse set(UUID userId, Integer amountCents) {
        if (amountCents == null) {
            budgets.findById(userId).ifPresent(budgets::delete);
            return new ShoppingBudgetResponse(null);
        }
        ShoppingBudget budget = budgets.findById(userId).orElseGet(() -> new ShoppingBudget(userId, amountCents));
        budget.setAmountCents(amountCents);
        budgets.save(budget);
        return new ShoppingBudgetResponse(amountCents);
    }
}
