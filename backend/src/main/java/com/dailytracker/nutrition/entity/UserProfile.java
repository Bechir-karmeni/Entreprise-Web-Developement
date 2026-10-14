package com.dailytracker.nutrition.entity;

import com.dailytracker.nutrition.nutrition.ActivityLevel;
import com.dailytracker.nutrition.nutrition.NutritionGoal;
import com.dailytracker.nutrition.nutrition.Sex;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "user_profiles")
public class UserProfile {

    /** Same value as the user's id: a profile belongs to exactly one user. */
    @Id
    @Column(name = "user_id", nullable = false, updatable = false)
    private UUID userId;

    @Column(name = "date_of_birth", nullable = false)
    private LocalDate dateOfBirth;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private Sex sex;

    @Column(name = "height_cm", nullable = false)
    private double heightCm;

    @Column(name = "weight_kg", nullable = false)
    private double weightKg;

    @Enumerated(EnumType.STRING)
    @Column(name = "activity_level", nullable = false, length = 30)
    private ActivityLevel activityLevel;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private NutritionGoal goal;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected UserProfile() {
        // required by JPA
    }

    public UserProfile(UUID userId) {
        this.userId = userId;
    }

    public void update(Sex sex, LocalDate dateOfBirth, double heightCm, double weightKg,
                       ActivityLevel activityLevel, NutritionGoal goal) {
        this.sex = sex;
        this.dateOfBirth = dateOfBirth;
        this.heightCm = heightCm;
        this.weightKg = weightKg;
        this.activityLevel = activityLevel;
        this.goal = goal;
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

    public UUID getUserId() { return userId; }
    public LocalDate getDateOfBirth() { return dateOfBirth; }
    public Sex getSex() { return sex; }
    public double getHeightCm() { return heightCm; }
    public double getWeightKg() { return weightKg; }
    public ActivityLevel getActivityLevel() { return activityLevel; }
    public NutritionGoal getGoal() { return goal; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
