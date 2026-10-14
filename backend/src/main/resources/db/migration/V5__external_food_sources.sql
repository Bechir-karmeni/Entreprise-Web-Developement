-- Foods can now come from online sources (Open Food Facts, USDA) as well as the seed data.
ALTER TABLE foods DROP CONSTRAINT ck_foods_category;
ALTER TABLE foods ADD CONSTRAINT ck_foods_category CHECK (category IN
    ('PROTEIN', 'FISH', 'DAIRY', 'GRAIN', 'LEGUME', 'VEGETABLE', 'FRUIT', 'FAT', 'NUTS_AND_SEEDS', 'OTHER'));

-- The same product name can exist in several sources, so names are no longer unique on their own.
ALTER TABLE foods DROP CONSTRAINT uk_foods_name;

ALTER TABLE foods ADD COLUMN source VARCHAR(30) NOT NULL DEFAULT 'LOCAL';
ALTER TABLE foods ADD COLUMN external_id VARCHAR(100);
ALTER TABLE foods ADD COLUMN brand VARCHAR(150);
-- FALSE when the source gives no allergen information. Such foods must never be treated as allergen-free.
ALTER TABLE foods ADD COLUMN allergens_known BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE foods ADD CONSTRAINT ck_foods_source CHECK (source IN ('LOCAL', 'OPEN_FOOD_FACTS', 'USDA'));
CREATE UNIQUE INDEX uk_foods_source_external ON foods (source, external_id);
