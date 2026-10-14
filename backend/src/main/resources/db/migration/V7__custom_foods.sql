-- Users can add their own foods. Owned foods have owner_user_id set; shared foods keep it NULL.
ALTER TABLE foods ADD COLUMN owner_user_id UUID REFERENCES users (id) ON DELETE CASCADE;
ALTER TABLE foods DROP CONSTRAINT ck_foods_source;
ALTER TABLE foods ADD CONSTRAINT ck_foods_source CHECK (source IN ('LOCAL', 'OPEN_FOOD_FACTS', 'USDA', 'CUSTOM'));
CREATE INDEX ix_foods_owner ON foods (owner_user_id);
