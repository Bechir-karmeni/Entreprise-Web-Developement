-- Food catalogue: nutrition values per serving, plus the allergens each food contains.
CREATE TABLE foods (
    id           UUID PRIMARY KEY,
    name         VARCHAR(150)     NOT NULL,
    category     VARCHAR(30)      NOT NULL,
    serving_size DOUBLE PRECISION NOT NULL,
    serving_unit VARCHAR(10)      NOT NULL,
    calories     INTEGER          NOT NULL,
    protein      DOUBLE PRECISION NOT NULL,
    carbs        DOUBLE PRECISION NOT NULL,
    fat          DOUBLE PRECISION NOT NULL,
    fiber        DOUBLE PRECISION NOT NULL,
    ingredients  VARCHAR(2000),
    created_at   TIMESTAMPTZ      NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ      NOT NULL DEFAULT now(),
    CONSTRAINT uk_foods_name UNIQUE (name),
    CONSTRAINT ck_foods_category CHECK (category IN
        ('PROTEIN', 'FISH', 'DAIRY', 'GRAIN', 'LEGUME', 'VEGETABLE', 'FRUIT', 'FAT', 'NUTS_AND_SEEDS')),
    CONSTRAINT ck_foods_serving CHECK (serving_size > 0 AND serving_unit IN ('g', 'ml', 'piece')),
    CONSTRAINT ck_foods_nutrients CHECK (calories >= 0 AND protein >= 0 AND carbs >= 0 AND fat >= 0 AND fiber >= 0)
);

CREATE INDEX ix_foods_category ON foods (category);

CREATE TABLE food_allergens (
    food_id  UUID        NOT NULL REFERENCES foods (id) ON DELETE CASCADE,
    allergen VARCHAR(30) NOT NULL,
    PRIMARY KEY (food_id, allergen),
    CONSTRAINT ck_food_allergens_value CHECK (allergen IN
        ('PEANUTS', 'TREE_NUTS', 'MILK', 'EGGS', 'SOY', 'GLUTEN', 'WHEAT', 'FISH', 'SHELLFISH', 'SESAME'))
);
