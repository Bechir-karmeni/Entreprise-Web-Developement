package com.dailytracker.nutrition.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

/** The answers to the Generate Plan questions, one row per user. */
@Entity
@Table(name = "meal_plan_preferences")
public class MealPlanPreference {

    @Id
    @Column(name = "user_id", nullable = false, updatable = false)
    private UUID userId;

    @Column(nullable = false)
    private boolean vegetarian;

    /** ALL, LACTOSE_FREE or NONE. */
    @Column(nullable = false, length = 20)
    private String dairy;

    @Column(nullable = false)
    private boolean eggs;

    @Column(nullable = false)
    private boolean nuts;

    @Column(nullable = false)
    private boolean gluten;

    @Column(nullable = false)
    private boolean fish;

    /** Comma-separated foods the user does not want, for example "mushrooms, coriander". */
    @Column(name = "excluded_foods", nullable = false, length = 500)
    private String excludedFoods;

    @Column(name = "meals_per_day", nullable = false)
    private int mealsPerDay;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected MealPlanPreference() {
        // required by JPA
    }

    /** A new row with the same defaults as the database. */
    public MealPlanPreference(UUID userId) {
        this.userId = userId;
        this.vegetarian = false;
        this.dairy = "ALL";
        this.eggs = true;
        this.nuts = true;
        this.gluten = true;
        this.fish = true;
        this.excludedFoods = "";
        this.mealsPerDay = 3;
        this.updatedAt = Instant.now();
    }

    public void update(boolean vegetarian, String dairy, boolean eggs, boolean nuts, boolean gluten, boolean fish,
                       String excludedFoods, int mealsPerDay) {
        this.vegetarian = vegetarian;
        this.dairy = dairy;
        this.eggs = eggs;
        this.nuts = nuts;
        this.gluten = gluten;
        this.fish = fish;
        this.excludedFoods = excludedFoods;
        this.mealsPerDay = mealsPerDay;
        this.updatedAt = Instant.now();
    }

    public UUID getUserId() { return userId; }
    public boolean isVegetarian() { return vegetarian; }
    public String getDairy() { return dairy; }
    public boolean isEggs() { return eggs; }
    public boolean isNuts() { return nuts; }
    public boolean isGluten() { return gluten; }
    public boolean isFish() { return fish; }
    public String getExcludedFoods() { return excludedFoods; }
    public int getMealsPerDay() { return mealsPerDay; }
    public Instant getUpdatedAt() { return updatedAt; }
}
