package com.dailytracker.nutrition.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;

import java.io.Serializable;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

/** A food the user has starred. One row per user and food. */
@Entity
@Table(name = "food_favorites")
@IdClass(FoodFavorite.Key.class)
public class FoodFavorite {

    @Id
    @Column(name = "user_id", nullable = false, updatable = false)
    private UUID userId;

    @Id
    @Column(name = "food_id", nullable = false, updatable = false)
    private UUID foodId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected FoodFavorite() {
        // required by JPA
    }

    public FoodFavorite(UUID userId, UUID foodId) {
        this.userId = userId;
        this.foodId = foodId;
        this.createdAt = Instant.now();
    }

    public UUID getUserId() { return userId; }
    public UUID getFoodId() { return foodId; }
    public Instant getCreatedAt() { return createdAt; }

    /** The composite key: user and food. */
    public static class Key implements Serializable {

        private UUID userId;
        private UUID foodId;

        protected Key() {
            // required by JPA
        }

        public Key(UUID userId, UUID foodId) {
            this.userId = userId;
            this.foodId = foodId;
        }

        @Override
        public boolean equals(Object other) {
            if (this == other) return true;
            if (!(other instanceof Key key)) return false;
            return Objects.equals(userId, key.userId) && Objects.equals(foodId, key.foodId);
        }

        @Override
        public int hashCode() {
            return Objects.hash(userId, foodId);
        }
    }
}
