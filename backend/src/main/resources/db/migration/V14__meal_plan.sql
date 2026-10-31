-- Meal plan: one recipe per user, day and meal. Totals are calculated from the recipes, not stored.
CREATE TABLE meal_plan_entries (
    id          UUID         PRIMARY KEY,
    user_id     UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    plan_date   DATE         NOT NULL,
    meal_type   VARCHAR(20)  NOT NULL,
    recipe_id   UUID         NOT NULL REFERENCES recipes (id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ  NOT NULL,
    CONSTRAINT uq_meal_plan_slot UNIQUE (user_id, plan_date, meal_type)
);

CREATE INDEX ix_meal_plan_user_date ON meal_plan_entries (user_id, plan_date);
