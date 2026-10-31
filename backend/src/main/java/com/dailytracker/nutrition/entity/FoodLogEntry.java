package com.dailytracker.nutrition.entity;

import com.dailytracker.nutrition.food.MealType;
import com.dailytracker.nutrition.food.MicronutrientJson;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "food_log_entries")
public class FoodLogEntry {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "user_id", nullable = false, updatable = false)
    private UUID userId;

    @Column(name = "food_id")
    private UUID foodId;

    @Column(name = "log_date", nullable = false)
    private LocalDate logDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "meal_type", nullable = false, length = 20)
    private MealType mealType;

    @Column(name = "food_name", nullable = false, length = 150)
    private String foodName;

    @Column(nullable = false)
    private double amount;

    @Column(name = "serving_unit", nullable = false, length = 10)
    private String servingUnit;

    @Column(nullable = false)
    private int calories;

    @Column(nullable = false)
    private double protein;

    @Column(nullable = false)
    private double carbs;

    @Column(nullable = false)
    private double fat;

    @Column(nullable = false)
    private double fiber;

    /** Vitamin and mineral amounts for the portion eaten, as JSON text. NULL when the food had no such data. */
    @Column(name = "micronutrients", length = 2000)
    private String micronutrientsJson;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected FoodLogEntry() {
        // required by JPA
    }

    public FoodLogEntry(UUID userId, LocalDate logDate, MealType mealType, UUID foodId, String foodName,
                        double amount, String servingUnit, int calories, double protein, double carbs,
                        double fat, double fiber) {
        this(userId, logDate, mealType, foodId, foodName, amount, servingUnit, calories, protein, carbs,
                fat, fiber, null);
    }

    /** Pass null for micronutrients when the food or the entry has no vitamin and mineral data. */
    public FoodLogEntry(UUID userId, LocalDate logDate, MealType mealType, UUID foodId, String foodName,
                        double amount, String servingUnit, int calories, double protein, double carbs,
                        double fat, double fiber, Map<String, Double> micronutrients) {
        this.id = UUID.randomUUID();
        this.userId = userId;
        this.logDate = logDate;
        this.mealType = mealType;
        this.foodId = foodId;
        this.foodName = foodName;
        this.amount = amount;
        this.servingUnit = servingUnit;
        this.calories = calories;
        this.protein = protein;
        this.carbs = carbs;
        this.fat = fat;
        this.fiber = fiber;
        this.micronutrientsJson = MicronutrientJson.write(micronutrients);
    }

    /**
     * Changes the amount eaten and scales the calories, macros and vitamins and minerals by the same ratio.
     * The entry keeps its food and meal; only the portion changes.
     */
    public void rescale(double newAmount) {
        double factor = newAmount / this.amount;
        this.calories = (int) Math.round(this.calories * factor);
        this.protein = roundOneDecimal(this.protein * factor);
        this.carbs = roundOneDecimal(this.carbs * factor);
        this.fat = roundOneDecimal(this.fat * factor);
        this.fiber = roundOneDecimal(this.fiber * factor);
        this.micronutrientsJson = MicronutrientJson.write(MicronutrientJson.scale(getMicronutrients(), factor));
        this.amount = newAmount;
    }

    private static double roundOneDecimal(double value) {
        return Math.round(value * 10.0) / 10.0;
    }

    @PrePersist
    void onCreate() {
        this.createdAt = Instant.now();
    }

    public UUID getId() { return id; }
    public UUID getUserId() { return userId; }
    public UUID getFoodId() { return foodId; }
    public LocalDate getLogDate() { return logDate; }
    public MealType getMealType() { return mealType; }
    public String getFoodName() { return foodName; }
    public double getAmount() { return amount; }
    public String getServingUnit() { return servingUnit; }
    public int getCalories() { return calories; }
    public double getProtein() { return protein; }
    public double getCarbs() { return carbs; }
    public double getFat() { return fat; }
    public double getFiber() { return fiber; }
    public Map<String, Double> getMicronutrients() { return MicronutrientJson.read(micronutrientsJson); }
    public Instant getCreatedAt() { return createdAt; }
}
