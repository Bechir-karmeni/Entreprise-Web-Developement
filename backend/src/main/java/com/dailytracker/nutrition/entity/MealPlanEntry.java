package com.dailytracker.nutrition.entity;

import com.dailytracker.nutrition.food.MealType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/** One planned meal: which recipe the user plans to eat for a given day and meal. */
@Entity
@Table(name = "meal_plan_entries")
public class MealPlanEntry {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "user_id", nullable = false, updatable = false)
    private UUID userId;

    @Column(name = "plan_date", nullable = false, updatable = false)
    private LocalDate planDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "meal_type", nullable = false, length = 20, updatable = false)
    private MealType mealType;

    @Column(name = "recipe_id", nullable = false)
    private UUID recipeId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected MealPlanEntry() {
        // required by JPA
    }

    public MealPlanEntry(UUID userId, LocalDate planDate, MealType mealType, UUID recipeId) {
        this.id = UUID.randomUUID();
        this.userId = userId;
        this.planDate = planDate;
        this.mealType = mealType;
        this.recipeId = recipeId;
        this.createdAt = Instant.now();
    }

    public void changeRecipe(UUID newRecipeId) {
        this.recipeId = newRecipeId;
    }

    public UUID getId() { return id; }
    public UUID getUserId() { return userId; }
    public LocalDate getPlanDate() { return planDate; }
    public MealType getMealType() { return mealType; }
    public UUID getRecipeId() { return recipeId; }
    public Instant getCreatedAt() { return createdAt; }
}
