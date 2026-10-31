import { describe, expect, it } from "vitest";
import { fitsGoal } from "./recipeFit";
import type { Recipe } from "../types/recipe";

function recipe(calories: number, proteinGrams: number, fiberGrams: number): Recipe {
  return {
    id: "r",
    name: "Test",
    description: "",
    servings: 1,
    prepMinutes: 10,
    tags: [],
    perServing: { calories, proteinGrams, carbsGrams: 0, fatGrams: 0, fiberGrams },
    steps: [],
    ingredients: [],
    allergens: [],
    allergensKnown: true,
  };
}

describe("fitsGoal", () => {
  it("keeps weight-loss recipes at 500 kcal or less", () => {
    expect(fitsGoal(recipe(500, 0, 0), "LOSE_WEIGHT")).toBe(true);
    expect(fitsGoal(recipe(501, 0, 0), "LOSE_WEIGHT")).toBe(false);
  });

  it("asks for 25 g protein when gaining weight or muscle", () => {
    expect(fitsGoal(recipe(600, 25, 0), "GAIN_MUSCLE")).toBe(true);
    expect(fitsGoal(recipe(600, 24, 0), "GAIN_WEIGHT")).toBe(false);
  });

  it("keeps maintenance recipes between 300 and 700 kcal", () => {
    expect(fitsGoal(recipe(300, 0, 0), "MAINTAIN_WEIGHT")).toBe(true);
    expect(fitsGoal(recipe(700, 0, 0), "MAINTAIN_WEIGHT")).toBe(true);
    expect(fitsGoal(recipe(299, 0, 0), "MAINTAIN_WEIGHT")).toBe(false);
  });

  it("asks for 5 g fibre for healthy eating", () => {
    expect(fitsGoal(recipe(400, 0, 5), "GENERAL_HEALTHY_EATING")).toBe(true);
    expect(fitsGoal(recipe(400, 0, 4.9), "GENERAL_HEALTHY_EATING")).toBe(false);
  });
});
