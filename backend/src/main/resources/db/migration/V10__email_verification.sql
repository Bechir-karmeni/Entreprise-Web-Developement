-- Email verification: new accounts must confirm their email with a 6-digit code.
-- Existing accounts are marked as verified, so this change does not lock anyone out.
ALTER TABLE users ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE users ALTER COLUMN email_verified SET DEFAULT FALSE;

-- Only a BCrypt hash of the code is stored, never the code itself.
CREATE TABLE email_verification_codes (
    id          UUID         PRIMARY KEY,
    user_id     UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    code_hash   VARCHAR(100) NOT NULL,
    expires_at  TIMESTAMPTZ  NOT NULL,
    attempts    INTEGER      NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ  NOT NULL,
    CONSTRAINT ck_email_codes_attempts CHECK (attempts >= 0)
);

CREATE INDEX ix_email_codes_user ON email_verification_codes (user_id);
