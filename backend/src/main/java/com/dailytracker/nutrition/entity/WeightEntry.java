package com.dailytracker.nutrition.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/** One weigh-in. There is at most one per user and day. */
@Entity
@Table(name = "weight_entries")
public class WeightEntry {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "user_id", nullable = false, updatable = false)
    private UUID userId;

    @Column(name = "log_date", nullable = false, updatable = false)
    private LocalDate logDate;

    @Column(name = "weight_kg", nullable = false)
    private double weightKg;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected WeightEntry() {
        // required by JPA
    }

    public WeightEntry(UUID userId, LocalDate logDate, double weightKg) {
        this.id = UUID.randomUUID();
        this.userId = userId;
        this.logDate = logDate;
        this.weightKg = weightKg;
        this.createdAt = Instant.now();
    }

    public void changeWeight(double weightKg) {
        this.weightKg = weightKg;
    }

    public UUID getId() { return id; }
    public UUID getUserId() { return userId; }
    public LocalDate getLogDate() { return logDate; }
    public double getWeightKg() { return weightKg; }
    public Instant getCreatedAt() { return createdAt; }
}
