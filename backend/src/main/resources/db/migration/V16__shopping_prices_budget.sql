-- Optional price per shopping item, in cents. Entered by the user; null means no price is known.
ALTER TABLE shopping_items ADD COLUMN price_cents INTEGER NULL;
ALTER TABLE shopping_items ADD CONSTRAINT ck_shopping_price CHECK (price_cents IS NULL OR price_cents >= 0);

-- One weekly shopping budget per user, in cents. No row means no budget is set.
CREATE TABLE shopping_budgets (
    user_id UUID PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    amount_cents INTEGER NOT NULL,
    CONSTRAINT ck_shopping_budget CHECK (amount_cents >= 0)
);
