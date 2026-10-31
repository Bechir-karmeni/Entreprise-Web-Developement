package com.dailytracker.nutrition.entity;

import com.dailytracker.nutrition.external.ExternalFood;
import com.dailytracker.nutrition.food.Allergen;
import com.dailytracker.nutrition.food.FoodCategory;
import com.dailytracker.nutrition.food.MicronutrientJson;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "foods")
public class Food {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    /** LOCAL for seed data; OPEN_FOOD_FACTS or USDA for imported foods; CUSTOM for foods added by a user. */
    @Column(nullable = false, length = 30)
    private String source = "LOCAL";

    @Column(name = "external_id", length = 100)
    private String externalId;

    /** The user who added a custom food. NULL for shared foods, which every user can see. */
    @Column(name = "owner_user_id", updatable = false)
    private UUID ownerUserId;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(length = 150)
    private String brand;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private FoodCategory category;

    @Column(name = "serving_size", nullable = false)
    private double servingSize;

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

    @Column(length = 2000)
    private String ingredients;

    /** Vitamin and mineral amounts per 100 g as JSON text. NULL when the source has no such data. */
    @Column(name = "micronutrients", length = 2000)
    private String micronutrientsJson;

    @Column(name = "allergens_known", nullable = false)
    private boolean allergensKnown = true;

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "food_allergens", joinColumns = @JoinColumn(name = "food_id"))
    @Enumerated(EnumType.STRING)
    @Column(name = "allergen", nullable = false, length = 30)
    private Set<Allergen> allergens = new HashSet<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected Food() {
        // required by JPA
    }

    /** A seed food from our own data. */
    public Food(String name, FoodCategory category, double servingSize, String servingUnit,
                int calories, double protein, double carbs, double fat, double fiber) {
        this.id = UUID.randomUUID();
        this.name = name;
        this.category = category;
        this.servingSize = servingSize;
        this.servingUnit = servingUnit;
        this.calories = calories;
        this.protein = protein;
        this.carbs = carbs;
        this.fat = fat;
        this.fiber = fiber;
    }

    /** A food imported from an online source. */
    public Food(ExternalFood item) {
        this.id = UUID.randomUUID();
        updateFrom(item);
    }

    /** A food added by a user. Only that user can see and delete it. */
    public Food(UUID ownerUserId, String name, String brand, FoodCategory category, double servingSize,
                String servingUnit, int calories, double protein, double carbs, double fat, double fiber,
                Set<Allergen> allergens) {
        this.id = UUID.randomUUID();
        this.source = "CUSTOM";
        this.ownerUserId = ownerUserId;
        this.name = name;
        this.brand = brand;
        this.category = category;
        this.servingSize = servingSize;
        this.servingUnit = servingUnit;
        this.calories = calories;
        this.protein = protein;
        this.carbs = carbs;
        this.fat = fat;
        this.fiber = fiber;
        this.allergensKnown = true;
        this.allergens.addAll(allergens);
    }

    /** Copies the values from an online source, so re-importing a food refreshes it. */
    public void updateFrom(ExternalFood item) {
        this.source = item.source();
        this.externalId = item.externalId();
        this.name = item.name();
        this.brand = item.brand();
        this.category = item.category();
        this.servingSize = item.servingSize();
        this.servingUnit = item.servingUnit();
        this.calories = item.calories();
        this.protein = item.protein();
        this.carbs = item.carbs();
        this.fat = item.fat();
        this.fiber = item.fiber();
        this.micronutrientsJson = MicronutrientJson.write(item.micronutrients());
        this.allergensKnown = item.allergensKnown();
        this.allergens.clear();
        this.allergens.addAll(item.allergens());
    }

    /** Shared foods are visible to everyone; custom foods only to their owner. */
    public boolean isVisibleTo(UUID userId) {
        return ownerUserId == null || ownerUserId.equals(userId);
    }

    public boolean isOwnedBy(UUID userId) {
        return ownerUserId != null && ownerUserId.equals(userId);
    }

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public String getSource() { return source; }
    public String getExternalId() { return externalId; }
    public UUID getOwnerUserId() { return ownerUserId; }
    public String getName() { return name; }
    public String getBrand() { return brand; }
    public FoodCategory getCategory() { return category; }
    public double getServingSize() { return servingSize; }
    public String getServingUnit() { return servingUnit; }
    public int getCalories() { return calories; }
    public double getProtein() { return protein; }
    public double getCarbs() { return carbs; }
    public double getFat() { return fat; }
    public double getFiber() { return fiber; }
    public Map<String, Double> getMicronutrients() { return MicronutrientJson.read(micronutrientsJson); }
    public String getIngredients() { return ingredients; }
    public boolean isAllergensKnown() { return allergensKnown; }
    public Set<Allergen> getAllergens() { return allergens; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
