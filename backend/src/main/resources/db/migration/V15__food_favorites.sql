-- Favourite foods per user. A favourite is a link to a food; the food itself stays in the foods table.
CREATE TABLE food_favorites (
    user_id     UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    food_id     UUID        NOT NULL REFERENCES foods (id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (user_id, food_id)
);
