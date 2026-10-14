-- One profile per user. The body and goal data drive the nutrition target calculation.
CREATE TABLE user_profiles (
    user_id        UUID PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    date_of_birth  DATE             NOT NULL,
    sex            VARCHAR(10)      NOT NULL,
    height_cm      DOUBLE PRECISION NOT NULL,
    weight_kg      DOUBLE PRECISION NOT NULL,
    activity_level VARCHAR(30)      NOT NULL,
    goal           VARCHAR(30)      NOT NULL,
    created_at     TIMESTAMPTZ      NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ      NOT NULL DEFAULT now(),
    CONSTRAINT ck_user_profiles_sex CHECK (sex IN ('MALE', 'FEMALE')),
    CONSTRAINT ck_user_profiles_activity CHECK (activity_level IN
        ('SEDENTARY', 'LIGHTLY_ACTIVE', 'MODERATELY_ACTIVE', 'VERY_ACTIVE', 'EXTRA_ACTIVE')),
    CONSTRAINT ck_user_profiles_goal CHECK (goal IN
        ('LOSE_WEIGHT', 'MAINTAIN_WEIGHT', 'GAIN_WEIGHT', 'GAIN_MUSCLE', 'GENERAL_HEALTHY_EATING')),
    CONSTRAINT ck_user_profiles_height CHECK (height_cm BETWEEN 100 AND 250),
    CONSTRAINT ck_user_profiles_weight CHECK (weight_kg BETWEEN 30 AND 300)
);
