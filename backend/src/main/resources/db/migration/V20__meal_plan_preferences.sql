-- Answers to the Generate Plan questions. One row per user; without a row the defaults apply.
CREATE TABLE meal_plan_preferences (
    user_id        UUID         PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    vegetarian     BOOLEAN      NOT NULL DEFAULT FALSE,
    dairy          VARCHAR(20)  NOT NULL DEFAULT 'ALL',
    eggs           BOOLEAN      NOT NULL DEFAULT TRUE,
    nuts           BOOLEAN      NOT NULL DEFAULT TRUE,
    gluten         BOOLEAN      NOT NULL DEFAULT TRUE,
    fish           BOOLEAN      NOT NULL DEFAULT TRUE,
    excluded_foods VARCHAR(500) NOT NULL DEFAULT '',
    meals_per_day  INTEGER      NOT NULL DEFAULT 3,
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT ck_mpp_dairy CHECK (dairy IN ('ALL', 'LACTOSE_FREE', 'NONE')),
    CONSTRAINT ck_mpp_meals CHECK (meals_per_day BETWEEN 3 AND 4)
);
