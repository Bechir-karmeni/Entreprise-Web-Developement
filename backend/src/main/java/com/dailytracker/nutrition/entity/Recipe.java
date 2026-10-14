package com.dailytracker.nutrition.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "recipes")
public class Recipe {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(nullable = false, length = 500)
    private String description;

    @Column(nullable = false)
    private int servings;

    @Column(name = "prep_minutes", nullable = false)
    private int prepMinutes;

    /** Comma-separated tags, for example VEGETARIAN,QUICK. */
    @Column(nullable = false, length = 200)
    private String tags;

    /** One step per line. */
    @Column(nullable = false, length = 3000)
    private String steps;

    @OneToMany(mappedBy = "recipe")
    @OrderBy("sortOrder ASC")
    private List<RecipeIngredient> ingredients = new ArrayList<>();

    protected Recipe() {
        // required by JPA
    }

    public UUID getId() { return id; }
    public String getName() { return name; }
    public String getDescription() { return description; }
    public int getServings() { return servings; }
    public int getPrepMinutes() { return prepMinutes; }
    public String getTags() { return tags; }
    public String getSteps() { return steps; }
    public List<RecipeIngredient> getIngredients() { return ingredients; }
}
