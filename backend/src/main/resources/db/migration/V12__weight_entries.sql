-- Body weight log: one weigh-in per user and day. Saving again on the same day replaces that day's value.
CREATE TABLE weight_entries (
    id          UUID             PRIMARY KEY,
    user_id     UUID             NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    log_date    DATE             NOT NULL,
    weight_kg   DOUBLE PRECISION NOT NULL,
    created_at  TIMESTAMPTZ      NOT NULL,
    CONSTRAINT ck_weight_kg CHECK (weight_kg >= 30 AND weight_kg <= 300),
    CONSTRAINT uq_weight_user_date UNIQUE (user_id, log_date)
);
