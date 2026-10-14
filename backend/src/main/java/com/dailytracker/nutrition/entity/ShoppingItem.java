package com.dailytracker.nutrition.entity;

import com.dailytracker.nutrition.shopping.ShoppingCategory;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "shopping_items")
public class ShoppingItem {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "user_id", nullable = false, updatable = false)
    private UUID userId;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, length = 40)
    private String quantity = "";

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ShoppingCategory category;

    @Column(nullable = false)
    private boolean checked;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected ShoppingItem() {
        // required by JPA
    }

    public ShoppingItem(UUID userId, String name, String quantity, ShoppingCategory category) {
        this.id = UUID.randomUUID();
        this.userId = userId;
        this.name = name;
        this.quantity = quantity;
        this.category = category;
        this.checked = false;
    }

    @PrePersist
    void onCreate() {
        this.createdAt = Instant.now();
    }

    public void setChecked(boolean checked) {
        this.checked = checked;
    }

    public UUID getId() { return id; }
    public UUID getUserId() { return userId; }
    public String getName() { return name; }
    public String getQuantity() { return quantity; }
    public ShoppingCategory getCategory() { return category; }
    public boolean isChecked() { return checked; }
    public Instant getCreatedAt() { return createdAt; }
}
