-- Food log: what a user ate on a given day. Values are copied when the entry is added,
-- so later changes to a food do not change past days.
CREATE TABLE food_log_entries (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    food_id UUID REFERENCES foods (id) ON DELETE SET NULL,
    log_date DATE NOT NULL,
    meal_type VARCHAR(20) NOT NULL,
    food_name VARCHAR(150) NOT NULL,
    amount DOUBLE PRECISION NOT NULL,
    serving_unit VARCHAR(10) NOT NULL,
    calories INTEGER NOT NULL,
    protein DOUBLE PRECISION NOT NULL,
    carbs DOUBLE PRECISION NOT NULL,
    fat DOUBLE PRECISION NOT NULL,
    fiber DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT ck_food_log_meal CHECK (meal_type IN ('BREAKFAST', 'LUNCH', 'DINNER', 'SNACK')),
    CONSTRAINT ck_food_log_amount CHECK (amount > 0 AND amount <= 5000),
    CONSTRAINT ck_food_log_calories CHECK (calories >= 0)
);

CREATE INDEX ix_food_log_user_date ON food_log_entries (user_id, log_date);
