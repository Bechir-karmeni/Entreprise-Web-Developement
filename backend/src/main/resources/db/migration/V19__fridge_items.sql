-- Items the user has in the fridge. Names are stored lowercase, so each name is unique per user.
CREATE TABLE fridge_items (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    CONSTRAINT uq_fridge_items_user_name UNIQUE (user_id, name)
);
