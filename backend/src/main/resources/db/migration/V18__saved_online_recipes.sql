-- Online recipes (recipeapi.io) that a user saved. The payload is a JSON snapshot of the recipe at save time.
CREATE TABLE saved_online_recipes (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    external_id INTEGER NOT NULL,
    name VARCHAR(200) NOT NULL,
    payload VARCHAR(20000) NOT NULL,
    CONSTRAINT uq_saved_online_recipes_user_external UNIQUE (user_id, external_id)
);

CREATE INDEX ix_saved_online_recipes_user ON saved_online_recipes (user_id);
