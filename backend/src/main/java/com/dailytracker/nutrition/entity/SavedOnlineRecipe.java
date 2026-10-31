package com.dailytracker.nutrition.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.util.UUID;

@Entity
@Table(name = "saved_online_recipes")
public class SavedOnlineRecipe {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "user_id", nullable = false, updatable = false)
    private UUID userId;

    @Column(name = "external_id", nullable = false)
    private int externalId;

    @Column(nullable = false, length = 200)
    private String name;

    /** The recipe as JSON, saved when the user saved it. */
    @Column(nullable = false, length = 20000)
    private String payload;

    protected SavedOnlineRecipe() {
        // required by JPA
    }

    public SavedOnlineRecipe(UUID userId, int externalId, String name, String payload) {
        this.id = UUID.randomUUID();
        this.userId = userId;
        this.externalId = externalId;
        this.name = name;
        this.payload = payload;
    }

    public UUID getId() { return id; }
    public UUID getUserId() { return userId; }
    public int getExternalId() { return externalId; }
    public String getName() { return name; }
    public String getPayload() { return payload; }
}
