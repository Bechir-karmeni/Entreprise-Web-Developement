package com.dailytracker.nutrition.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.util.UUID;

@Entity
@Table(name = "recipe_ingredients")
public class RecipeIngredient {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "recipe_id", nullable = false)
    private Recipe recipe;

    @ManyToOne
    @JoinColumn(name = "food_id", nullable = false)
    private Food food;

    /** Amount for the whole recipe, in the food's serving unit. */
    @Column(nullable = false)
    private double grams;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    protected RecipeIngredient() {
        // required by JPA
    }

    public RecipeIngredient(Recipe recipe, Food food, double grams, int sortOrder) {
        this.id = UUID.randomUUID();
        this.recipe = recipe;
        this.food = food;
        this.grams = grams;
        this.sortOrder = sortOrder;
    }

    public UUID getId() { return id; }
    public Recipe getRecipe() { return recipe; }
    public Food getFood() { return food; }
    public double getGrams() { return grams; }
    public int getSortOrder() { return sortOrder; }
}
