-- Water intake: one row per glass or bottle the user logs. The daily total is calculated, not stored.
CREATE TABLE water_intake_entries (
    id          UUID        PRIMARY KEY,
    user_id     UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    log_date    DATE        NOT NULL,
    amount_ml   INTEGER     NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL,
    CONSTRAINT ck_water_amount CHECK (amount_ml > 0 AND amount_ml <= 2000)
);

CREATE INDEX ix_water_user_date ON water_intake_entries (user_id, log_date);
