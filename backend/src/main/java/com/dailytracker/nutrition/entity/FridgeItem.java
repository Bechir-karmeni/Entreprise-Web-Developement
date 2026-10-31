package com.dailytracker.nutrition.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.util.UUID;

@Entity
@Table(name = "fridge_items")
public class FridgeItem {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "user_id", nullable = false, updatable = false)
    private UUID userId;

    @Column(nullable = false, length = 100)
    private String name;

    protected FridgeItem() {
        // required by JPA
    }

    public FridgeItem(UUID userId, String name) {
        this.id = UUID.randomUUID();
        this.userId = userId;
        this.name = name;
    }

    public UUID getId() { return id; }
    public UUID getUserId() { return userId; }
    public String getName() { return name; }
}
