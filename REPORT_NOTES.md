# Daily Tracker - Nutrition: Development log

Each step records: what was done, the problem and fix (if any), the reason, and the verification.

## Step 1-7: Requirements and environment (see the PDF setup log)
- Specification and design analysed; stack chosen (see the setup log PDF).
- Java 21, Maven 3.9.11, Node.js 24, Git, Docker verified on Windows 11.

## Step 8: Project foundation
What: created the project skeleton: backend (Spring Boot 3.5, Maven), frontend (Vite, React 18, TypeScript), docker-compose.yml with PostgreSQL 16, .env.example, .gitignore, README.
Why: a fixed structure and a single `docker compose` setup let any developer or examiner run the project. Secrets come from environment variables, as the specification requires.
Verification: pending (run `mvn -q compile` in backend/, `npm install && npm run build` in frontend/, and `docker compose up -d postgres`).
Presentation slide idea: "One repository, one command to start the database".

## Step 9: Backend starts and connects to PostgreSQL
What: started PostgreSQL 16 in Docker (docker compose up -d postgres), loaded the .env values into the PowerShell session, and ran the backend with mvn spring-boot:run.
Result: Spring Boot 3.5.6 started on Java 21.0.12 in 6 seconds. HikariCP connected to PostgreSQL 16.15. Flyway created its history table (flyway_schema_history). Hibernate 6.6.29 started with ddl-auto=validate. Tomcat started on port 8080.
Problems and fixes:
- Docker engine not running (error on the named pipe dockerDesktopLinuxEngine). Fix: started Docker Desktop, waited for the engine, then ran docker info to confirm.
- PostgreSQL was not installed locally. This is not needed: the database runs in a container from the postgres:16 image.
Warnings that will be resolved in later steps:
- Flyway: "No migrations found". Expected until the first migration (V1) is added with the user tables.
- Spring Security printed a generated development password. This is replaced when the JWT authentication is implemented. The password is only for local development and must not be shared.
- Zero JPA repositories found. Expected until entities are added.
Why: confirms that configuration (environment variables, datasource, Flyway, JPA) works before any feature code depends on it. Secrets come from the environment, not from source files.
Verification: backend log shows "Started NutritionApplication" and PostgreSQL 16.15 connection. Frontend check (npm run dev, http://localhost:5173) still pending.
Presentation slide idea: "One command starts the database; the backend connects automatically".

## Step 10: Frontend starts
What: installed frontend dependencies (npm install), built the production bundle (npm run build), and started the Vite development server (npm run dev) in a second PowerShell window while the backend ran in the first.
Result: the build succeeded (34 modules, 159 kB JavaScript, gzip 52 kB). The development server runs on http://localhost:5173 and shows the placeholder page.
Notes for the report:
- npm install reported 5 vulnerabilities (1 moderate, 4 high). Decision: no automatic fix with --force, because it can break packages. The vulnerabilities will be reviewed and documented before the final submission.
- The esbuild install-script warning is expected for Vite 5 and is harmless.
Why: confirms that the frontend toolchain (TypeScript compilation, Vite bundling, React rendering) works before features are added.
Verification: npm run build succeeded; the page loads at http://localhost:5173.
Presentation slide idea: "Two commands start the whole application: the backend on 8080 and the frontend on 5173".

## Step 11: User authentication (backend)
What: added the first Flyway migration (V1, table users with a unique lowercase email and a BCrypt password hash), the User entity and repository, DTOs with Bean Validation, JWT access and refresh tokens (jjwt 0.12.6), Spring Security configured as stateless with /api/auth/** public, a global exception handler returning one consistent error format, and GET /api/users/me as a protected test route.
Why:
- BCrypt (strength 12) hashes passwords; plaintext is never stored, as the specification requires.
- Short-lived access tokens (15 min) limit damage if a token is stolen; refresh tokens (14 days) keep users signed in. Separate secrets and a "type" claim stop a refresh token from being used as an access token.
- The login error is the same for an unknown email and a wrong password, so the API does not reveal which accounts exist.
- Logout is stateless for now: the client deletes its tokens. Server-side revocation is future work and must be stated in the report.
Decisions: jjwt was chosen over the Spring Security resource-server library for simpler, explainable token code.
Problems and fixes:
- The first start after the change failed: the new terminal did not have the .env values loaded, so the database URL was empty. Fix: load .env into the session before starting.
- Port 8080 was still held by the previous backend process. Fix: stopped that process (Stop-Process) and restarted.
Verification:
- mvn test: 12 tests run, 0 failures (JwtServiceTest and AuthServiceTest).
- Flyway applied migration 1 "create users" on PostgreSQL 16.15.
- Live API test: POST /api/auth/register returned the new user; GET /api/users/me with the access token returned the same user; the same request without a token returned 401.
Login was tested afterwards: correct password returned the user; wrong password returned 401.
Not yet tested: refresh-token exchange (POST /api/auth/refresh) and the duplicate-email response (409).
Presentation slide idea: "A password is never stored in plain text; a protected endpoint returns 401 without a valid token".

## Step 12: User authentication (frontend)
What: added the sign-up page (first name, last name, email, password, confirm password), the login page, a session that is restored after a page reload, a refresh-token exchange when the access token has expired, a protected dashboard route that redirects guests to the login page, and a logout button. Tailwind CSS 3.4.17 was installed as the specification requires; it was used by the placeholder but had never been installed. Vitest was added for the validation tests.
Why:
- Client-side validation gives fast feedback. It mirrors the backend rules (8 to 72 characters, at least one letter and one digit, valid email, matching passwords). The backend still validates everything, because client checks can be bypassed.
- The access token is short-lived (15 minutes). When it expires, the stored refresh token is used once to get a new pair, so the user stays signed in for up to 14 days without typing the password again.
- Route guards are a usability feature, not a security boundary. The backend is the real protection: it returns 401 for protected endpoints without a valid token.
- Guests who open /login while signed in are sent to the dashboard, so the login page cannot be used by mistake when a session already exists.
Decisions:
- Tokens are stored in localStorage. This keeps the user signed in after a reload. Trade-off for the report: localStorage can be read by any script running on the page, so a cross-site scripting (XSS) bug would expose the tokens. The safer alternative is httpOnly cookies, which needs backend cookie handling and CSRF protection. It is documented as a known limitation.
- The backend error message for a taken email is shown on the email field. Per-field backend errors are shown next to their inputs.
- Tailwind CSS v3 was chosen because its PostCSS setup is stable with Vite 5.
Problems and fixes:
- The placeholder page used Tailwind class names, but Tailwind was not installed, so the styles were not applied. Fix: installed Tailwind, PostCSS and Autoprefixer, and added the config files.
- The TypeScript check needed an explicit ChangeEvent import instead of the global React namespace. Fix: imported the type.
Verification:
- In a clean copy of the project: npm install, npm run build (TypeScript and Vite) and npx vitest run passed. Build: 46 modules, JavaScript 174 kB (gzip 57 kB). Tests: 10 of 10 passed (password rules, email rules, registration and login form validation).
- Not yet verified in a browser on your computer. Manual test to do: sign up, reload the page (still signed in), log out, log in again, try a wrong password.
Commands to run in PowerShell (folder quoted because of the spaces):
  cd "C:\Users\Bechir\Desktop\Entreprise Web Development\frontend"
  npm install
  npm run build
  npm test
  npm run dev
Presentation slide idea: "The sign-up form checks the input in the browser, and the server checks it again. A stored session survives a page reload."

### Step 12 addendum: pages rebuilt to match the design mockups
What: the login and sign-up pages were rebuilt to follow the two design mockups: two-column layout, a green information panel, password strength bars with show/hide toggles, a "passwords match" check, a required terms checkbox, and Google and Apple buttons.
Why: the specification and the design mockup define the screens. Matching them lets the report show design-to-code traceability.
Decisions and limits:
- Google and Apple sign-in are shown but not functional: the backend has no OAuth. Clicking them shows a notice.
- "Forgot password?" and "Remember this device for 30 days" are shown but do nothing: no backend support yet.
- The mockup contains marketing text (user counts, a testimonial with a named person, "HIPAA" and "biometric" wording). It was kept for visual fidelity, but it is placeholder content, not verified claims. It must be replaced or labelled as placeholder before the presentation.
- The terms checkbox is checked only in the browser; the backend does not store consent yet.
Verification: npm run build passed (50 modules, JavaScript 192 kB, gzip 61 kB); npx vitest run passed 14 of 14 tests (added password strength and terms checks). Visual comparison with the mockups is still to be done in the browser.

## Step 13: Nutrition target calculation (backend, part 1)
What: added a standalone calculator that computes daily targets from a body profile: BMR (Mifflin-St Jeor), TDEE (activity factor), calorie target (goal adjustment), protein, fat, carbohydrates, fiber and water. All constants are in one settings object (NutritionSettings), not hard-coded in the formulas.
Why:
- The specification requires a documented, configurable method. Keeping the formulas in one class with no Spring dependency makes them easy to explain in the report and to test.
- Mifflin-St Jeor is a widely used BMR equation. Activity factors (1.2 to 1.9) are the standard multipliers for TDEE.
- Protein is set per kg of body weight, because it is the value most often used for muscle maintenance and growth.
- Fat is a share of calories (25 %). Carbohydrates are the remaining calories, so the three macros always add up to the calorie target.
- A minimum calorie value (1200 kcal) stops very low targets. The result shows when it was applied (minimumCaloriesApplied), so the user can see it.
Decisions:
- Targets are estimates for healthy adults, not medical advice. The app states this on the dashboard in a later step.
- Input limits (height 100 to 250 cm, weight 30 to 300 kg, age 13 to 120) reject impossible values before calculating.
Verification:
- Three worked cases were checked by hand and by a standalone program in the development environment: 19 of 19 checks passed (including the calorie floor and the input rejection).
- Four JUnit tests were added to the project (NutritionTargetCalculatorTest). They are not yet run on your computer; run mvn test to confirm (expected: 16 tests, 0 failures).
Not yet done (next part of Step 13): saving the profile (Flyway migration V2, entity, repository), the REST endpoints (GET/PUT /api/profile, GET /api/profile/targets) and the Spring configuration of the settings through application.yml.
Presentation slide idea: "The calorie target comes from a documented formula, and every constant can be changed in one place."

### Step 13 part 2: profile storage and target endpoints (backend)
What: added the user profile (table user_profiles, Flyway V2) with the body and goal data, and the endpoints GET /api/profile, PUT /api/profile (create or update) and GET /api/profile/targets (calculated daily targets). A 404 response is returned when no profile exists yet.
Why:
- The calculation needs stored body data, so the profile is saved once and used for every target calculation.
- The database checks (CHECK constraints) repeat the input limits, so invalid data is rejected even if the API check is bypassed.
- Targets are calculated on each request rather than stored, so changing the settings updates every user's targets. The stored values are the inputs only.
- The Clock is injected, so age tests do not depend on today's date.
Decisions:
- One profile per user, with the user id as the primary key.
- Settings are still in code (NutritionConfig). Moving them to application.yml is left for later.
Problems and fixes: none so far. The Spring code could not be compiled in the development sandbox (Maven Central is not reachable there), so it is verified only by the user's own mvn test.
Verification:
- mvn test: 19 tests run, 0 failures (includes 4 calculator tests and 3 profile service tests).
- Flyway applied migration 2 "create user profiles" on PostgreSQL 16.15; Hibernate schema validation passed.
- Live API test: PUT /api/profile saved the profile; GET /api/profile/targets returned 2759 kcal, 128 g protein, 389 g carbs, 77 g fat, 39 g fiber and 2.8 L water, matching the hand calculation.
- Problems found during testing: an older backend process still held port 8080 (stopped it); a login with placeholder text returned 400 (validation of the email).
Presentation slide idea: "The user enters body data once; the server calculates the daily targets from it."

## Step 14: Language support and dashboard (frontend)
What: added English and German translations with a language switch (EN / DE) in the header. The choice is saved in the browser; the first visit uses the browser language. Built the dashboard with the sidebar, the daily targets from the backend (calories, protein, carbohydrates, fat, fiber, water) and a notice when no profile exists yet. Added automatic token refresh for protected requests, so a 15-minute access token does not log the user out in the middle of a session.
Why:
- The designs are in English and German, and the report is in English. Both languages are kept in dictionaries that TypeScript checks: a missing German key is a compile error.
- Reusing the saved refresh token during normal use prevents unexpected logouts after the short access token expires.
- The dashboard is the first screen after login and shows the output of the calculation from Step 13.
Decisions:
- Translation is a typed dictionary, not a library, to keep the dependencies small and the code easy to explain.
- Only the dashboard is built. The other navigation items are shown as "Soon" until their step is built.
- The layout follows the thumbnail of the design. It must be compared with the full-size design when available.
Verification: npm run build passed (58 modules, JavaScript 200 kB, gzip 63 kB); npx vitest run passed 16 of 16 tests (14 earlier plus 2 translation checks). Browser check to do: switch language, reload, and log in; the target values must match the backend.
Presentation slide idea: "Every label exists in English and German; a missing translation fails the build."

## Step 15: Food database (backend)
What: added the food catalogue: table foods (name, category, serving size and unit, calories, protein, carbohydrates, fat, fiber, ingredients), table food_allergens (one row per allergen a food contains), 20 seed foods, and the endpoints GET /api/foods (search by name, paged, at most 50 per page) and GET /api/foods/{id}.
Why:
- The specification requires foods with nutrition values and allergens, so meals and recommendations can be filtered later. Allergens are a separate table so one food can have several, and the database only accepts the allergen names from the specification.
- Nutrition values are stored per serving, so more nutrients can be added later as columns without changing the calculation.
- The page size is capped at 50 so one request cannot load the whole table.
- Lazy loading of allergens is done inside the service transaction, so the controller never touches the database.
Data check: for each seed food the calories were compared with the macronutrients (4 kcal per gram of protein and carbohydrate, 9 kcal per gram of fat). All 20 are within 20 %, which is expected for published tables. The values are approximate and must be checked against product labels before real use. This is also stated in the report.
Decision: allergen data is informational. The application must state that it cannot guarantee a food is safe (specification section 7).
Verification:
- mvn test: 23 tests run, 0 failures (includes 4 food service tests).
- Flyway applied migrations 3 (create foods) and 4 (seed foods).
- Live API test: GET /api/foods?query=egg returned "Egg, whole, hard-boiled" with calories 155 and allergen EGGS; GET /api/foods?size=50 reported 20 foods.
- Problems found during testing: the first requests returned 500 because the backend was still the old process (it had not been restarted after the new code). Restarting it fixed the problem. Note: a request to an unknown path also returns 500 because the global handler catches all exceptions; mapping missing routes to 404 is a possible later improvement.
Presentation slide idea: "Every food lists its allergens in a separate table, so a filter can exclude them later."

## Step 16: Recipes (backend and frontend)
What: added recipes with their ingredients (migration V9: tables recipes and recipe_ingredients, 6 starter recipes that use the seed foods). The backend calculates each recipe's nutrition per serving from its ingredients. New endpoints GET /api/recipes and GET /api/recipes/{id}. The frontend page /recipes shows filter chips (All, High protein, Under 21 min, Vegetarian), recipe cards, and a detail dialog with ingredients, steps and nutrition per serving. "Track one serving" writes one food-log entry per ingredient through the existing POST /api/food-log.
Why:
- Recipe nutrition is calculated, not stored. If a food's values change, every recipe that uses it stays correct.
- Logging a serving reuses the food log from Step 15, so there is one place where eating is recorded.
- The per-serving calculation is a static method with a unit test, so it can be checked without a database.
Decisions:
- Plan, Favorite, the pantry scanner, curated collections and the prompt builder are shown as "Soon", because their data and logic are not built yet.
- Recipe names, descriptions and steps stay in English, because they are database content, not interface text.
- The design chip "Zero-Watch <14g" was left out, because its meaning is unclear.
Problems and fixes:
- The shell reported a stray "EOF" error after writing the backend files. All files were checked and are present with the expected content.
- Known limitation: "Track one serving" sends one request per ingredient. If one request fails after others succeeded, the earlier entries remain. A single batch endpoint would fix this later.
Verification:
- Frontend (scratch copy): npx tsc -b passed, npx vitest run passed 23 of 23 tests, npx vite build passed.
- Backend: not compiled in the development sandbox (Maven Central is not reachable there). RecipeServiceTest (2 tests) must be run by the user with mvn clean test. Flyway must apply V9 and Hibernate schema validation must pass.
Presentation slide idea: "A recipe's calories are calculated from its ingredients, so the recipe and the food table can never disagree."

## Schritt 16: Rezepte (Backend und Frontend)
Was: Rezepte mit ihren Zutaten hinzugefügt (Migration V9: Tabellen recipes und recipe_ingredients, 6 Start-Rezepte mit den Seed-Lebensmitteln). Das Backend berechnet die Nährwerte pro Portion aus den Zutaten. Neue Endpunkte GET /api/recipes und GET /api/recipes/{id}. Die Frontend-Seite /recipes zeigt Filter-Chips (Alle, High Protein, Unter 21 Min., Vegetarisch), Rezeptkarten und einen Detaildialog mit Zutaten, Zubereitung und Nährwerten pro Portion. "Eine Portion tracken" schreibt pro Zutat einen Eintrag über den bestehenden Endpunkt POST /api/food-log.
Warum:
- Die Nährwerte von Rezepten werden berechnet, nicht gespeichert. Ändert sich ein Lebensmittel, bleiben alle Rezepte mit diesem Lebensmittel korrekt.
- Das Tracken einer Portion nutzt das Ernährungstagebuch aus Schritt 15, damit das Essen nur an einer Stelle erfasst wird.
- Die Berechnung pro Portion ist eine statische Methode mit Unit-Test und kann ohne Datenbank geprüft werden.
Entscheidungen:
- Planen, Favorit, Vorratsscanner, kuratierte Sammlungen und der Prompt-Generator sind als "Demnächst" markiert, weil ihre Daten und Logik noch fehlen.
- Rezeptnamen, Beschreibungen und Schritte bleiben auf Englisch, weil es Datenbankinhalte und keine Oberflächentexte sind.
- Der Designchip "Zero-Watch <14g" wurde weggelassen, da seine Bedeutung unklar ist.
Probleme und Lösungen:
- Die Shell meldete nach dem Schreiben der Backend-Dateien einen überflüssigen Fehler "EOF". Alle Dateien wurden geprüft und sind mit dem erwarteten Inhalt vorhanden.
- Bekannte Einschränkung: "Eine Portion tracken" sendet eine Anfrage pro Zutat. Schlägt eine Anfrage nach erfolgreichen anderen fehl, bleiben die früheren Einträge bestehen. Ein Batch-Endpunkt würde das später lösen.
Verifikation:
- Frontend (Arbeitskopie): npx tsc -b bestanden, npx vitest run 23 von 23 Tests bestanden, npx vite build bestanden.
- Backend: in der Entwicklungsumgebung nicht kompiliert (Maven Central ist dort nicht erreichbar). RecipeServiceTest (2 Tests) muss der Nutzer mit mvn clean test ausführen. Flyway muss V9 anwenden, und die Schema-Validierung von Hibernate muss bestehen.
Folienidee für die Präsentation: "Die Kalorien eines Rezepts werden aus seinen Zutaten berechnet, daher können Rezept und Lebensmitteltabelle nie voneinander abweichen."

## Step 17: Meal Planner page (frontend, layout only)
What: built the /meal-planner page to match the design. It shows a weekly grid (Monday to Sunday, four meal slots per day) and three cards. Planning, the plan generator, macro split and shopping from the plan are shown as "Soon".
Why: the design shows a planner, and the report needs the page to match it. The planner needs its own database table and endpoints, which we did not build in this step.
Decisions:
- Visual only. The design's numbers (2,500 kcal, 160 g protein, "98 % match", the sample meals) are not copied, because the app does not calculate them yet.
- Planner and Recipes stay separate. A saved weekly plan would be a later step.
Problems and fixes: the design image is small, so the layout was matched by eye. Compare it with the full-size design before the presentation.
Verification: npx tsc -b passed, npx vitest run passed 23 of 23 tests, npx vite build passed.
Presentation slide idea: "The planner page shows only what works; everything else is labelled Soon, not filled with invented numbers."

## Schritt 17: Wochenplaner (Frontend, nur Layout)
Was: die Seite /meal-planner wurde passend zum Design gebaut. Sie zeigt ein Wochenraster (Montag bis Sonntag, vier Mahlzeiten pro Tag) und drei Karten. Planung, Plan-Generator, Makro-Verteilung und Einkauf aus dem Plan sind als "Demnächst" markiert.
Warum: das Design zeigt einen Planer, und der Bericht soll die Seite mit dem Design vergleichen. Der Planer braucht eine eigene Datenbanktabelle und eigene Endpunkte, die in diesem Schritt noch nicht gebaut wurden.
Entscheidungen:
- Nur Layout. Die Zahlen des Designs (2.500 kcal, 160 g Eiweiß, "98 % Übereinstimmung", die Beispielmahlzeiten) wurden nicht übernommen, weil die App sie noch nicht berechnet.
- Planer und Rezepte bleiben getrennt. Ein gespeicherter Wochenplan wäre ein späterer Schritt.
Probleme und Lösungen: das Design-Bild ist klein, daher wurde das Layout nach Augenmaß angepasst. Vor der Präsentation mit dem Originalbild vergleichen.
Verifikation: npx tsc -b bestanden, npx vitest run 23 von 23 Tests bestanden, npx vite build bestanden.
Folienidee für die Präsentation: "Die Planer-Seite zeigt nur, was funktioniert; alles andere ist als Demnächst markiert und nicht mit erfundenen Zahlen gefüllt."

## Step 18: Recipe detail page (frontend)
What: the recipe card now opens its own page /recipes/:id, which replaces the dialog. The page uses the existing GET /api/recipes/{id}. It shows the steps, the nutrition per serving, the ingredients and a portion selector (1 to 8). The selector changes the ingredient amounts and the total calories, and "Track N portion(s)" logs exactly that many portions. The logging code moved to one shared function (lib/recipeTracking.ts), used by the list and the detail page.
Why:
- A separate page gives the recipe room for its steps and nutrition, as in the design.
- Scaling by portions is calculated from the stored recipe, so the numbers match the nutrition shown.
- One shared logging function means both pages write food-log entries the same way.
Decisions:
- Step timers, ingredient alternatives and the vitamin overview are "Soon". The design's sample numbers (620 kcal, 98 %, the sample products) are not copied.
- Recipe text stays in English, as before.
Problems and fixes: none in the frontend build. The backend endpoint GET /api/recipes/{id} already existed, so no backend change was needed.
Verification: npx tsc -b passed, npx vitest run passed 23 of 23 tests, npx vite build passed.
Presentation slide idea: "Changing the portion count recalculates the amounts from the same recipe data, so the logged food always matches what is shown."

## Schritt 18: Rezept-Detailseite (Frontend)
Was: die Rezeptkarte öffnet jetzt eine eigene Seite /recipes/:id, die den Dialog ersetzt. Die Seite nutzt den bestehenden Endpunkt GET /api/recipes/{id}. Sie zeigt Zubereitungsschritte, Nährwerte pro Portion, Zutaten und eine Portionsauswahl (1 bis 8). Die Auswahl ändert die Zutatenmengen und die Gesamtkalorien, und "{Anzahl} Portion(en) tracken" trägt genau so viele Portionen ein. Die Logik dafür liegt in einer gemeinsamen Funktion (lib/recipeTracking.ts), die Liste und Detailseite nutzen.
Warum:
- Eine eigene Seite bietet dem Rezept Platz für Schritte und Nährwerte, wie im Design.
- Die Skalierung nach Portionen wird aus den gespeicherten Rezeptdaten berechnet, daher stimmen die Zahlen mit den angezeigten Nährwerten überein.
- Eine gemeinsame Funktion sorgt dafür, dass beide Seiten Einträge gleich speichern.
Entscheidungen:
- Timer, Zutaten-Alternativen und die Vitamin-Übersicht sind als "Demnächst" markiert. Die Beispielzahlen des Designs (620 kcal, 98 %, die Beispielprodukte) wurden nicht übernommen.
- Rezepttexte bleiben wie bisher auf Englisch.
Probleme und Lösungen: beim Frontend-Build gab es keine Probleme. Der Backend-Endpunkt GET /api/recipes/{id} existierte bereits, daher war keine Backend-Änderung nötig.
Verifikation: npx tsc -b bestanden, npx vitest run 23 von 23 Tests bestanden, npx vite build bestanden.
Folienidee für die Präsentation: "Eine Änderung der Portionenzahl berechnet die Mengen aus denselben Rezeptdaten neu, daher stimmt das eingetragene Essen immer mit der Anzeige überein."

## Step 19: Today page (frontend)
What: built the /today page with real data from the food log for the chosen day and from the saved targets. It shows the energy balance (eaten, target, remaining or over), the macros and fiber as bars against their targets, the hydration goal, and the four meals with each logged food. Entries can be removed, and the day can be changed with previous and next buttons (not beyond today). The AI coach, the micronutrient audit and the fasting window are marked "Soon".
Why:
- The page reads the same endpoints as the dashboard (GET /api/food-log and GET /api/profile/targets), so the numbers agree across pages.
- Changing the day reuses the date parameter of the food log, so no new backend code was needed.
- Removing an entry reloads the day from the server instead of recalculating totals in the browser, so the totals always come from the database.
Decisions:
- The design's sample values (1,850 kcal, 420 kcal breakfast, the sample meal names, "98 % match") are not copied. Only logged data appears.
- Water intake is not stored yet, so the hydration card shows only the goal.
- Future days cannot be opened, because nothing can be logged for them.
Problems and fixes: none in the frontend build.
Verification: npx tsc -b passed, npx vitest run passed 23 of 23 tests, npx vite build passed.
Presentation slide idea: "The Today page shows only what was really logged; everything the app cannot calculate yet is labelled Soon."

## Schritt 19: Heute-Seite (Frontend)
Was: die Seite /today zeigt echte Daten aus dem Ernährungstagebuch des gewählten Tages und die gespeicherten Ziele. Sie zeigt die Energiebilanz (gegessen, Ziel, übrig oder darüber), Makros und Ballaststoffe als Balken gegen ihre Ziele, das Flüssigkeitsziel und die vier Mahlzeiten mit jedem eingetragenen Lebensmittel. Einträge lassen sich entfernen, und mit den Pfeilen wird der Tag gewechselt (nicht über heute hinaus). KI-Coach, Mikronährstoff-Check und Fastenfenster sind als "Demnächst" markiert.
Warum:
- Die Seite nutzt dieselben Endpunkte wie das Dashboard (GET /api/food-log und GET /api/profile/targets), damit die Zahlen auf allen Seiten übereinstimmen.
- Der Tageswechsel nutzt den Datumsparameter des Ernährungstagebuchs, daher war kein neuer Backend-Code nötig.
- Beim Entfernen eines Eintrags wird der Tag neu vom Server geladen, statt die Summen im Browser neu zu berechnen. So kommen die Summen immer aus der Datenbank.
Entscheidungen:
- Die Beispielwerte des Designs (1.850 kcal, 420 kcal Frühstück, die Beispielmahlzeiten, "98 % Übereinstimmung") wurden nicht übernommen. Es erscheinen nur tatsächlich eingetragene Daten.
- Die Wasseraufnahme wird noch nicht gespeichert, daher zeigt die Karte nur das Ziel.
- Zukünftige Tage lassen sich nicht öffnen, weil dafür nichts eingetragen werden kann.
Probleme und Lösungen: beim Frontend-Build gab es keine Probleme.
Verifikation: npx tsc -b bestanden, npx vitest run 23 von 23 Tests bestanden, npx vite build bestanden.
Folienidee für die Präsentation: "Die Heute-Seite zeigt nur tatsächlich eingetragene Daten; alles, was die App noch nicht berechnen kann, ist als Demnächst markiert."

## Step 20: Today page matched to the design (frontend)
What: rebuilt /today to follow the design's structure: header with the day and calendar week, day navigation, a day-status line, the calorie ring with consumed, remaining and BMR/TDEE, four macro cards with bars and "left" values, a hydration card with the goal, the meal pipeline with status and macro chips for each meal, and a column with the coach, micronutrient audit, metabolic curve and fasting window. The top bar shows the day's calories against the target.
Why: the report asks for the design to be followed closely. Every number on the page comes from the food log and the saved targets, so the page shows what the user actually logged.
Decisions:
- The design's sample values (1,850 kcal, 420 kcal breakfast, 98 %, "Metabolic sensor active", the sample meal descriptions) are not used. They would appear as the user's real data.
- Features the app does not have yet are shown as disabled and labelled "Soon": water buttons (+250/+500/+1000 ml), activity burn, sorting, edit and duplicate of meals, the AI coach, the micronutrient audit, the metabolic curve and the fasting window.
- The user chose this option (exact layout with real data) over adding the missing features or copying the sample values.
Problems and fixes: the first version used a simpler layout; it was replaced after the user asked for an exact match. The translation block was replaced with a script, which checks that exactly one block matched.
Verification: npx tsc -b passed, npx vitest run passed 23 of 23 tests, npx vite build passed. Visual comparison with the design still needs to be done in the browser.
Presentation slide idea: "The design shows what the app should look like; the numbers come from the database, and anything not built yet is labelled Soon."

## Schritt 20: Heute-Seite nach dem Design (Frontend)
Was: die Seite /today wurde so umgebaut, dass sie dem Aufbau des Designs folgt: Kopfzeile mit Tag und Kalenderwoche, Tageswechsel, Zeile zum Tagesstatus, Kalorienring mit aufgenommen, verbleibend und Grundumsatz/Gesamtumsatz, vier Makrokarten mit Balken und "übrig"-Werten, eine Flüssigkeitskarte mit Ziel, die Mahlzeiten-Pipeline mit Status und Makro-Chips je Mahlzeit sowie eine Spalte mit KI-Coach, Mikronährstoff-Audit, metabolischer Kurve und Fastenfenster. Die obere Leiste zeigt die Kalorien des Tages gegenüber dem Ziel.
Warum: der Bericht verlangt, dass das Design genau umgesetzt wird. Jede Zahl auf der Seite stammt aus dem Ernährungstagebuch und den gespeicherten Zielen, daher zeigt die Seite nur, was tatsächlich eingetragen wurde.
Entscheidungen:
- Die Beispielwerte des Designs (1.850 kcal, 420 kcal Frühstück, 98 %, "Metabolic sensor active", die Beispielbeschreibungen der Mahlzeiten) werden nicht übernommen. Sie würden wie echte Daten des Nutzers aussehen.
- Funktionen, die die App noch nicht hat, sind deaktiviert und als "Demnächst" markiert: Wasser-Buttons (+250/+500/+1.000 ml), Aktivitätsverbrauch, Sortierung, Bearbeiten und Duplizieren von Mahlzeiten, KI-Coach, Mikronährstoff-Audit, metabolische Kurve und Fastenfenster.
- Der Nutzer hat diese Variante gewählt (exaktes Layout mit echten Daten), statt die fehlenden Funktionen zu bauen oder die Beispielwerte zu übernehmen.
Probleme und Lösungen: die erste Fassung hatte ein einfacheres Layout; sie wurde ersetzt, nachdem der Nutzer eine genaue Übereinstimmung verlangt hatte. Der Übersetzungsblock wurde mit einem Skript ersetzt, das prüft, dass genau ein Block gefunden wird.
Verifikation: npx tsc -b bestanden, npx vitest run 23 von 23 Tests bestanden, npx vite build bestanden. Der Vergleich mit dem Design im Browser steht noch aus.
Folienidee für die Präsentation: "Das Design zeigt, wie die App aussehen soll; die Zahlen kommen aus der Datenbank, und alles, was noch nicht gebaut ist, ist als Demnächst markiert."

## Step 21: "Log meal" dialog from the header (frontend)
What: the "+ Log meal" button in the top bar now opens a dialog on every page, following the design. The dialog has the meal choice (breakfast, lunch, dinner, snack), today's remaining calories and macros, a search of the common and custom foods, quick picks, a list of results with selection, and a portion panel with an amount field, quick amounts (50, 100, 150, 180, 250) and the calories and macros for the chosen amount. Several foods can be selected, and "Log & close" writes one food-log entry per food to the chosen meal. After saving, every open page (Today, Dashboard, Food tracking) reloads its numbers.
Why:
- The button used to go to the food-tracking page. The design shows the logging as a dialog that can be opened from anywhere.
- The search and the entries use the existing endpoints (GET /api/foods, POST /api/food-log), so no backend change was needed.
- Reloading through one shared event keeps the numbers the same on every page after a meal is added.
Decisions:
- The design's "Zwischenmahlzeit" tab is not included, because the app's meal types are breakfast, lunch, dinner and snack.
- The AI plate scan, the barcode scanner, quick macros, the preparation methods, favorites and the filters "Frequent", "My recipes", "High protein" and "Verified" are disabled and labelled "Soon". Their data does not exist yet.
Problems and fixes:
- If one food fails while several are being saved, the foods saved before it stay in the log. The dialog reloads the pages in that case and shows the error. Saving everything in one request would fix this later.
Verification: npx tsc -b passed, npx vitest run passed 23 of 23 tests, npx vite build passed. The dialog still needs a manual test in the browser: search, select two foods, log, and check the Today page.
Presentation slide idea: "One button logs a meal from any page, and every page updates at once through a shared event."

## Schritt 21: Dialog "Mahlzeit erfassen" in der Kopfleiste (Frontend)
Was: der Button "+ Mahlzeit erfassen" in der oberen Leiste öffnet jetzt auf jeder Seite einen Dialog nach dem Design. Der Dialog enthält die Wahl der Mahlzeit (Frühstück, Mittagessen, Abendessen, Snack), die heute verbleibenden Kalorien und Makros, eine Suche in den allgemeinen und eigenen Lebensmitteln, Schnellwahl, eine Trefferliste mit Auswahl und einen Portionsbereich mit Mengenfeld, Schnellmengen (50, 100, 150, 180, 250) und den Kalorien und Makros für die gewählte Menge. Mehrere Lebensmittel können ausgewählt werden, und "Erfassen & Schließen" schreibt pro Lebensmittel einen Eintrag in die gewählte Mahlzeit. Danach laden alle offenen Seiten (Heute, Übersicht, Ernährungstracker) ihre Zahlen neu.
Warum:
- Der Button führte bisher zur Seite Ernährungstracker. Das Design zeigt das Erfassen als Dialog, der von überall geöffnet werden kann.
- Suche und Einträge nutzen die bestehenden Endpunkte (GET /api/foods, POST /api/food-log), daher war keine Backend-Änderung nötig.
- Ein gemeinsames Ereignis für das Neuladen hält die Zahlen auf allen Seiten nach dem Eintragen gleich.
Entscheidungen:
- Der Designreiter "Zwischenmahlzeit" fehlt, weil die App die Mahlzeiten Frühstück, Mittagessen, Abendessen und Snack kennt.
- KI-Teller-Scan, Barcode-Scanner, Schnell-Makros, Zubereitungsarten, Favoriten und die Filter "Häufig gegessen", "Eigene Rezepte", "High Protein" und "Verifiziert" sind deaktiviert und als "Demnächst" markiert, weil ihre Daten noch fehlen.
Probleme und Lösungen:
- Scheitert ein Lebensmittel beim Speichern mehrerer Lebensmittel, bleiben die davor gespeicherten im Tagebuch. In diesem Fall laden die Seiten neu, und der Fehler wird angezeigt. Ein Speichern aller Lebensmittel in einer Anfrage würde das später beheben.
Verifikation: npx tsc -b bestanden, npx vitest run 23 von 23 Tests bestanden, npx vite build bestanden. Der Dialog muss noch im Browser getestet werden: suchen, zwei Lebensmittel auswählen, erfassen und die Heute-Seite prüfen.
Folienidee für die Präsentation: "Ein Knopf erfasst eine Mahlzeit von jeder Seite, und alle Seiten aktualisieren sich gleichzeitig über ein gemeinsames Ereignis."

## Step 22: Quick entry tab in the add-meal window (backend and frontend)
What: the add-meal window has a second tab, "Schnell-Makros", with the quick-entry design. The user types calories and macros directly (protein, carbohydrates, fat, fiber in grams), sees the energy share of each macro and a plausibility check, and saves one entry to the chosen meal. New endpoint POST /api/food-log/quick. The entry is stored as one portion, with the name the user typed or "Quick entry" by default.
Why:
- Restaurant meals and estimates are not in the food database, so the user needs a way to log them.
- The plausibility line compares the kcal the user entered with the kcal calculated from the macros (4 kcal per gram of protein and carbohydrate, 9 kcal per gram of fat). It warns about inconsistent input without blocking the save.
- The table food_log_entries already allows entries without a food (food_id is nullable), so no database migration was needed.
Decisions:
- Saved templates, the time of the meal and auto-calculation are shown as "Soon". The design's template values (Protein-Shake Whey, Großer Salat & Öl) are not copied, because they are sample data. The time is not stored, and the templates need a new table.
- The design's extra meal tabs ("Snack 1", "Spätmahlzeit") are not included, because the app's meal types are breakfast, lunch, dinner and snack.
Problems and fixes: the backend could not be compiled in the development sandbox. FoodLogQuickEntryTest (2 tests) must be run with mvn clean test. The frontend build passed.
Verification:
- Frontend (scratch copy): npx tsc -b passed, npx vitest run passed 23 of 23 tests, npx vite build passed.
- Backend: FoodLogQuickEntryTest checks the default name and the trimming. The endpoint must be tested live once the backend runs.
Presentation slide idea: "Manual entries are stored as their own log rows, so restaurant meals count in the totals without being in the food database."

## Schritt 22: Schnellerfassung im Fenster "Mahlzeit erfassen" (Backend und Frontend)
Was: das Fenster "Mahlzeit erfassen" hat einen zweiten Reiter, "Schnell-Makros", mit dem Design der Schnellerfassung. Der Nutzer gibt Kalorien und Makros direkt ein (Eiweiß, Kohlenhydrate, Fett, Ballaststoffe in Gramm), sieht den Energieanteil jedes Makros und eine Plausibilitätsprüfung und speichert einen Eintrag in die gewählte Mahlzeit. Neuer Endpunkt POST /api/food-log/quick. Der Eintrag wird als eine Portion gespeichert, mit dem eingegebenen Namen oder "Quick entry" als Standard.
Warum:
- Restaurant-Mahlzeiten und Schätzungen stehen nicht in der Lebensmitteldatenbank, daher braucht der Nutzer eine Möglichkeit, sie zu erfassen.
- Die Plausibilitätszeile vergleicht die eingegebenen kcal mit den aus den Makros berechneten kcal (4 kcal pro Gramm Eiweiß und Kohlenhydrate, 9 kcal pro Gramm Fett). Sie warnt bei widersprüchlichen Angaben, ohne das Speichern zu blockieren.
- Die Tabelle food_log_entries erlaubt bereits Einträge ohne Lebensmittel (food_id ist optional), daher war keine Datenbankmigration nötig.
Entscheidungen:
- Gespeicherte Vorlagen, die Uhrzeit der Mahlzeit und die Autokalkulation sind als "Demnächst" markiert. Die Vorlagenbeispiele des Designs (Protein-Shake Whey, Großer Salat & Öl) wurden nicht übernommen, weil es Beispieldaten sind. Die Uhrzeit wird nicht gespeichert, und Vorlagen brauchen eine neue Tabelle.
- Die zusätzlichen Mahlzeit-Reiter des Designs ("Snack 1", "Spätmahlzeit") fehlen, weil die App die Mahlzeiten Frühstück, Mittagessen, Abendessen und Snack kennt.
Probleme und Lösungen: das Backend konnte in der Entwicklungsumgebung nicht kompiliert werden. FoodLogQuickEntryTest (2 Tests) muss mit mvn clean test ausgeführt werden. Der Frontend-Build war erfolgreich.
Verifikation:
- Frontend (Arbeitskopie): npx tsc -b bestanden, npx vitest run 23 von 23 Tests bestanden, npx vite build bestanden.
- Backend: FoodLogQuickEntryTest prüft den Standardnamen und das Kürzen des Namens. Der Endpunkt muss live getestet werden, sobald das Backend läuft.
Folienidee für die Präsentation: "Manuelle Einträge werden als eigene Tagebuchzeilen gespeichert, daher zählen Restaurant-Mahlzeiten in den Summen, ohne in der Lebensmitteldatenbank zu stehen."

## Step 23: "Create custom food" dialog matches the design (frontend)
What: the "Quick add food" button on the Food tracking page opens the "Create custom food" design. The left side has four sections: 1 basic information (name required, brand optional, category disabled as "Coming soon"), 2 serving size and reference basis (switch between "Per 100 g / ml" and "Per 1 portion", portion size and unit), 3 macronutrients (energy in kcal required, protein, carbohydrates, fat, fiber) and allergens. The right side has a live preview: energy split bar, nutrition facts table with kcal and kJ (kcal × 4.184), macro shares, and a plausibility check (within 10 %, at least 10 kcal). The footer has "Save & add another", which saves and clears the form while the dialog stays open, and "Save food", which saves and closes.
Why:
- The old dialog was a single plain form. The design shows the reference basis and a live preview, so the user sees the effect of each value before saving.
- The save still uses the existing validation (buildCustomFood) and the existing endpoint (POST /api/foods). No backend change was needed.
Decisions:
- Per 100 g / ml fixes the reference amount to 100. The portion size field is only active in "Per 1 portion" mode, so the value saved always matches the basis the user chose.
- Category, favorites, "available for quick pick and planner", and the sugar, saturated fat and salt details are disabled and labelled "Coming soon". The backend has no fields for them yet.
- The design's sample name and brand are not copied. Empty fields show neutral placeholders.
Problems and fixes:
- The dialog used to close after every save. The callback now receives a second value (addAnother). The Food tracking page closes the dialog only for a normal save.
Verification: npx tsc -b passed, npx vitest run passed 23 of 23 tests, npx vite build passed. Still to test in the browser: create a food per 100 g, create one per portion, use "Save & add another", and check the food in the search.
Presentation slide idea: "The preview shows the nutrition label while the user types, so wrong values are visible before they are saved."

## Schritt 23: Dialog "Eigenes Lebensmittel erstellen" nach dem Design (Frontend)
Was: der Button "Quick add food" auf der Seite Ernährungstracker öffnet das Design "Eigenes Lebensmittel erstellen". Links gibt es vier Abschnitte: 1 Basis-Informationen (Name Pflicht, Marke optional, Kategorie als "Demnächst" deaktiviert), 2 Portionsgröße und Referenzbasis (Umschalter "Pro 100 g / ml" und "Pro 1 Portion", Portionsgröße und Einheit), 3 Makronährstoffe (Brennwert in kcal Pflicht, Eiweiß, Kohlenhydrate, Fett, Ballaststoffe) und Allergene. Rechts steht eine Live-Vorschau: Balken der Energieverteilung, Nährwerttabelle mit kcal und kJ (kcal × 4,184), Anteile der Makros und eine Plausibilitätsprüfung (innerhalb von 10 %, mindestens 10 kcal). Die Fußzeile hat "Speichern & Weiteres anlegen", das speichert und das Formular leert, während der Dialog offen bleibt, und "Lebensmittel speichern", das speichert und schließt.
Warum:
- Der alte Dialog war ein einfaches Formular. Das Design zeigt die Referenzbasis und eine Live-Vorschau, damit der Nutzer die Wirkung jedes Wertes sieht, bevor er speichert.
- Das Speichern nutzt weiterhin die bestehende Prüfung (buildCustomFood) und den bestehenden Endpunkt (POST /api/foods). Eine Backend-Änderung war nicht nötig.
Entscheidungen:
- "Pro 100 g / ml" legt den Bezugswert auf 100 fest. Das Feld Portionsgröße ist nur im Modus "Pro 1 Portion" aktiv, so passt der gespeicherte Wert immer zur gewählten Basis.
- Kategorie, Favoriten, "Für Schnellwahl und Planer" sowie die Angaben zu Zucker, gesättigten Fettsäuren und Salz sind deaktiviert und als "Demnächst" markiert. Das Backend hat dafür noch keine Felder.
- Name und Marke aus dem Design werden nicht übernommen. Leere Felder zeigen neutrale Platzhalter.
Probleme und Lösungen:
- Der Dialog schloss sich bisher nach jedem Speichern. Der Rückruf bekommt jetzt einen zweiten Wert (addAnother). Die Seite Ernährungstracker schließt den Dialog nur beim normalen Speichern.
Verifikation: npx tsc -b bestanden, npx vitest run 23 von 23 Tests bestanden, npx vite build bestanden. Noch im Browser zu testen: ein Lebensmittel pro 100 g anlegen, eins pro Portion, "Speichern & Weiteres anlegen" verwenden und das Lebensmittel in der Suche prüfen.
Folienidee für die Präsentation: "Die Vorschau zeigt das Nährwertetikett, während der Nutzer tippt, daher sind falsche Werte schon vor dem Speichern sichtbar."
