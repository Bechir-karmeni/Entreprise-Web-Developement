-- Vitamin and mineral amounts as JSON text, keyed by Micronutrient name.
-- On foods the amounts are per 100 g; on log entries they are scaled to the portion eaten.
-- NULL means the source had no such data, which is different from zero.
ALTER TABLE foods ADD COLUMN micronutrients VARCHAR(2000);
ALTER TABLE food_log_entries ADD COLUMN micronutrients VARCHAR(2000);
