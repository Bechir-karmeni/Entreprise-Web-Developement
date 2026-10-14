-- Shopping list items. Each user has their own list.
CREATE TABLE shopping_items (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    quantity VARCHAR(40) NOT NULL DEFAULT '',
    category VARCHAR(30) NOT NULL,
    checked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT ck_shopping_category CHECK (category IN ('PROTEIN', 'DAIRY', 'PRODUCE', 'GRAINS_PANTRY', 'OTHER'))
);

CREATE INDEX ix_shopping_items_user ON shopping_items (user_id);
