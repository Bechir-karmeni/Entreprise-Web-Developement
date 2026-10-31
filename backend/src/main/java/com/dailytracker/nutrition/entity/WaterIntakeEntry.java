package com.dailytracker.nutrition.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/** One logged drink of water. The amount is stored in millilitres. */
@Entity
@Table(name = "water_intake_entries")
public class WaterIntakeEntry {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "user_id", nullable = false, updatable = false)
    private UUID userId;

    @Column(name = "log_date", nullable = false, updatable = false)
    private LocalDate logDate;

    @Column(name = "amount_ml", nullable = false, updatable = false)
    private int amountMl;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected WaterIntakeEntry() {
        // required by JPA
    }

    public WaterIntakeEntry(UUID userId, LocalDate logDate, int amountMl) {
        this.id = UUID.randomUUID();
        this.userId = userId;
        this.logDate = logDate;
        this.amountMl = amountMl;
        this.createdAt = Instant.now();
    }

    public UUID getId() { return id; }
    public UUID getUserId() { return userId; }
    public LocalDate getLogDate() { return logDate; }
    public int getAmountMl() { return amountMl; }
    public Instant getCreatedAt() { return createdAt; }
}
