package com.dailytracker.nutrition.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.util.UUID;

/** A user's weekly shopping budget in cents. One row per user. */
@Entity
@Table(name = "shopping_budgets")
public class ShoppingBudget {

    @Id
    @Column(name = "user_id", nullable = false, updatable = false)
    private UUID userId;

    @Column(name = "amount_cents", nullable = false)
    private int amountCents;

    protected ShoppingBudget() {
        // required by JPA
    }

    public ShoppingBudget(UUID userId, int amountCents) {
        this.userId = userId;
        this.amountCents = amountCents;
    }

    public void setAmountCents(int amountCents) {
        this.amountCents = amountCents;
    }

    public UUID getUserId() { return userId; }
    public int getAmountCents() { return amountCents; }
}
