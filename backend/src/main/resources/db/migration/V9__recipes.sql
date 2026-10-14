-- Recipes are made of foods from the food table. Nutrition is calculated from those foods, not stored.
CREATE TABLE recipes (
    id UUID PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    description VARCHAR(500) NOT NULL,
    servings INTEGER NOT NULL,
    prep_minutes INTEGER NOT NULL,
    tags VARCHAR(200) NOT NULL DEFAULT '',
    steps VARCHAR(3000) NOT NULL,
    CONSTRAINT ck_recipes_servings CHECK (servings > 0),
    CONSTRAINT ck_recipes_prep CHECK (prep_minutes > 0)
);

CREATE TABLE recipe_ingredients (
    id UUID PRIMARY KEY,
    recipe_id UUID NOT NULL REFERENCES recipes (id) ON DELETE CASCADE,
    food_id UUID NOT NULL REFERENCES foods (id) ON DELETE CASCADE,
    grams DOUBLE PRECISION NOT NULL,
    sort_order INTEGER NOT NULL,
    CONSTRAINT ck_recipe_ingredients_grams CHECK (grams > 0)
);

CREATE INDEX ix_recipe_ingredients_recipe ON recipe_ingredients (recipe_id);

-- Starter recipes (fixed ids so their ingredients can refer to them).
INSERT INTO recipes (id, name, description, servings, prep_minutes, tags, steps) VALUES
('a0000000-0000-0000-0000-000000000001', 'Banana oat bowl with peanut butter',
 'Warm oats with banana, peanut butter and milk. A simple, filling breakfast.', 1, 10, 'VEGETARIAN,QUICK',
 'Cook the oats in the milk for 5 minutes, stirring.
Slice the banana on top.
Add the peanut butter and serve.'),
('a0000000-0000-0000-0000-000000000002', 'Chicken and broccoli rice bowl',
 'Lean protein with rice and broccoli, finished with olive oil.', 1, 25, 'HIGH_PROTEIN',
 'Cook the rice as the package says.
Steam the broccoli for 5 minutes.
Warm the chicken, slice it, and serve over the rice with the broccoli and a drizzle of olive oil.'),
('a0000000-0000-0000-0000-000000000003', 'Greek yogurt bowl with banana and almonds',
 'A high-protein breakfast or snack that takes under 5 minutes.', 1, 5, 'VEGETARIAN,QUICK,HIGH_PROTEIN',
 'Spoon the yogurt into a bowl.
Slice the banana and add it with the oats.
Sprinkle the almonds on top.'),
('a0000000-0000-0000-0000-000000000004', 'Salmon with potatoes and broccoli',
 'A fish dinner with boiled potatoes, broccoli and olive oil.', 1, 30, 'HIGH_PROTEIN',
 'Boil the potatoes until soft, about 15 minutes.
Steam the broccoli for 5 minutes.
Warm the salmon and serve with the potatoes, broccoli and olive oil.'),
('a0000000-0000-0000-0000-000000000005', 'Lentil and chickpea rice bowl',
 'A plant-based bowl with lentils, chickpeas, rice and sesame seeds.', 2, 25, 'VEGETARIAN',
 'Cook the rice as the package says.
Warm the lentils and chickpeas with the olive oil in a pan for 5 minutes.
Serve over the rice and sprinkle with sesame seeds.'),
('a0000000-0000-0000-0000-000000000006', 'Tofu and broccoli stir-fry with rice',
 'Golden tofu with broccoli and sesame seeds, served on rice.', 2, 20, 'VEGETARIAN,QUICK',
 'Cut the tofu into cubes and fry in the olive oil until golden.
Steam the broccoli and cook the rice.
Toss everything with the sesame seeds and serve.');

-- Ingredients: grams for the whole recipe (all servings).
INSERT INTO recipe_ingredients (id, recipe_id, food_id, grams, sort_order)
SELECT gen_random_uuid(), 'a0000000-0000-0000-0000-000000000001', id, 60, 1 FROM foods WHERE name = 'Oats, rolled, dry' AND owner_user_id IS NULL;
INSERT INTO recipe_ingredients (id, recipe_id, food_id, grams, sort_order)
SELECT gen_random_uuid(), 'a0000000-0000-0000-0000-000000000001', id, 100, 2 FROM foods WHERE name = 'Banana' AND owner_user_id IS NULL;
INSERT INTO recipe_ingredients (id, recipe_id, food_id, grams, sort_order)
SELECT gen_random_uuid(), 'a0000000-0000-0000-0000-000000000001', id, 15, 3 FROM foods WHERE name = 'Peanut butter' AND owner_user_id IS NULL;
INSERT INTO recipe_ingredients (id, recipe_id, food_id, grams, sort_order)
SELECT gen_random_uuid(), 'a0000000-0000-0000-0000-000000000001', id, 200, 4 FROM foods WHERE name = 'Milk, whole' AND owner_user_id IS NULL;

INSERT INTO recipe_ingredients (id, recipe_id, food_id, grams, sort_order)
SELECT gen_random_uuid(), 'a0000000-0000-0000-0000-000000000002', id, 150, 1 FROM foods WHERE name = 'Chicken breast, cooked' AND owner_user_id IS NULL;
INSERT INTO recipe_ingredients (id, recipe_id, food_id, grams, sort_order)
SELECT gen_random_uuid(), 'a0000000-0000-0000-0000-000000000002', id, 180, 2 FROM foods WHERE name = 'Rice, white, cooked' AND owner_user_id IS NULL;
INSERT INTO recipe_ingredients (id, recipe_id, food_id, grams, sort_order)
SELECT gen_random_uuid(), 'a0000000-0000-0000-0000-000000000002', id, 100, 3 FROM foods WHERE name = 'Broccoli, cooked' AND owner_user_id IS NULL;
INSERT INTO recipe_ingredients (id, recipe_id, food_id, grams, sort_order)
SELECT gen_random_uuid(), 'a0000000-0000-0000-0000-000000000002', id, 5, 4 FROM foods WHERE name = 'Olive oil' AND owner_user_id IS NULL;

INSERT INTO recipe_ingredients (id, recipe_id, food_id, grams, sort_order)
SELECT gen_random_uuid(), 'a0000000-0000-0000-0000-000000000003', id, 250, 1 FROM foods WHERE name = 'Greek yogurt, plain, full fat' AND owner_user_id IS NULL;
INSERT INTO recipe_ingredients (id, recipe_id, food_id, grams, sort_order)
SELECT gen_random_uuid(), 'a0000000-0000-0000-0000-000000000003', id, 80, 2 FROM foods WHERE name = 'Banana' AND owner_user_id IS NULL;
INSERT INTO recipe_ingredients (id, recipe_id, food_id, grams, sort_order)
SELECT gen_random_uuid(), 'a0000000-0000-0000-0000-000000000003', id, 15, 3 FROM foods WHERE name = 'Almonds' AND owner_user_id IS NULL;
INSERT INTO recipe_ingredients (id, recipe_id, food_id, grams, sort_order)
SELECT gen_random_uuid(), 'a0000000-0000-0000-0000-000000000003', id, 30, 4 FROM foods WHERE name = 'Oats, rolled, dry' AND owner_user_id IS NULL;

INSERT INTO recipe_ingredients (id, recipe_id, food_id, grams, sort_order)
SELECT gen_random_uuid(), 'a0000000-0000-0000-0000-000000000004', id, 150, 1 FROM foods WHERE name = 'Salmon, Atlantic, cooked' AND owner_user_id IS NULL;
INSERT INTO recipe_ingredients (id, recipe_id, food_id, grams, sort_order)
SELECT gen_random_uuid(), 'a0000000-0000-0000-0000-000000000004', id, 250, 2 FROM foods WHERE name = 'Potato, boiled' AND owner_user_id IS NULL;
INSERT INTO recipe_ingredients (id, recipe_id, food_id, grams, sort_order)
SELECT gen_random_uuid(), 'a0000000-0000-0000-0000-000000000004', id, 120, 3 FROM foods WHERE name = 'Broccoli, cooked' AND owner_user_id IS NULL;
INSERT INTO recipe_ingredients (id, recipe_id, food_id, grams, sort_order)
SELECT gen_random_uuid(), 'a0000000-0000-0000-0000-000000000004', id, 7, 4 FROM foods WHERE name = 'Olive oil' AND owner_user_id IS NULL;

INSERT INTO recipe_ingredients (id, recipe_id, food_id, grams, sort_order)
SELECT gen_random_uuid(), 'a0000000-0000-0000-0000-000000000005', id, 300, 1 FROM foods WHERE name = 'Lentils, cooked' AND owner_user_id IS NULL;
INSERT INTO recipe_ingredients (id, recipe_id, food_id, grams, sort_order)
SELECT gen_random_uuid(), 'a0000000-0000-0000-0000-000000000005', id, 200, 2 FROM foods WHERE name = 'Chickpeas, cooked' AND owner_user_id IS NULL;
INSERT INTO recipe_ingredients (id, recipe_id, food_id, grams, sort_order)
SELECT gen_random_uuid(), 'a0000000-0000-0000-0000-000000000005', id, 300, 3 FROM foods WHERE name = 'Rice, white, cooked' AND owner_user_id IS NULL;
INSERT INTO recipe_ingredients (id, recipe_id, food_id, grams, sort_order)
SELECT gen_random_uuid(), 'a0000000-0000-0000-0000-000000000005', id, 10, 4 FROM foods WHERE name = 'Olive oil' AND owner_user_id IS NULL;
INSERT INTO recipe_ingredients (id, recipe_id, food_id, grams, sort_order)
SELECT gen_random_uuid(), 'a0000000-0000-0000-0000-000000000005', id, 10, 5 FROM foods WHERE name = 'Sesame seeds, dried' AND owner_user_id IS NULL;

INSERT INTO recipe_ingredients (id, recipe_id, food_id, grams, sort_order)
SELECT gen_random_uuid(), 'a0000000-0000-0000-0000-000000000006', id, 400, 1 FROM foods WHERE name = 'Tofu, firm' AND owner_user_id IS NULL;
INSERT INTO recipe_ingredients (id, recipe_id, food_id, grams, sort_order)
SELECT gen_random_uuid(), 'a0000000-0000-0000-0000-000000000006', id, 300, 2 FROM foods WHERE name = 'Rice, white, cooked' AND owner_user_id IS NULL;
INSERT INTO recipe_ingredients (id, recipe_id, food_id, grams, sort_order)
SELECT gen_random_uuid(), 'a0000000-0000-0000-0000-000000000006', id, 300, 3 FROM foods WHERE name = 'Broccoli, cooked' AND owner_user_id IS NULL;
INSERT INTO recipe_ingredients (id, recipe_id, food_id, grams, sort_order)
SELECT gen_random_uuid(), 'a0000000-0000-0000-0000-000000000006', id, 10, 4 FROM foods WHERE name = 'Sesame seeds, dried' AND owner_user_id IS NULL;
INSERT INTO recipe_ingredients (id, recipe_id, food_id, grams, sort_order)
SELECT gen_random_uuid(), 'a0000000-0000-0000-0000-000000000006', id, 10, 5 FROM foods WHERE name = 'Olive oil' AND owner_user_id IS NULL;
