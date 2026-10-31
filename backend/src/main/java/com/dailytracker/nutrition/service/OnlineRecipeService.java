package com.dailytracker.nutrition.service;

import com.dailytracker.nutrition.dto.OnlineRecipeFilters;
import com.dailytracker.nutrition.dto.OnlineRecipeOptions;
import com.dailytracker.nutrition.dto.OnlineRecipePage;
import com.dailytracker.nutrition.dto.OnlineRecipeShoppingRequest;
import com.dailytracker.nutrition.dto.SavedOnlineRecipeResponse;
import com.dailytracker.nutrition.dto.ShoppingItemRequest;
import com.dailytracker.nutrition.dto.ShoppingItemResponse;
import com.dailytracker.nutrition.ai.GeminiClient;
import com.dailytracker.nutrition.entity.SavedOnlineRecipe;
import com.dailytracker.nutrition.exception.ExternalServiceUnavailableException;
import com.dailytracker.nutrition.exception.InvalidRequestException;
import com.dailytracker.nutrition.exception.ResourceNotFoundException;
import com.dailytracker.nutrition.external.MealDbClient;
import com.dailytracker.nutrition.external.OnlineRecipe;
import com.dailytracker.nutrition.repository.SavedOnlineRecipeRepository;
import com.dailytracker.nutrition.shopping.ShoppingCategory;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.TreeSet;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Online recipes from TheMealDB (search, filters, detail, saving, shopping list) and recipes that Gemini
 * writes on request. Generated recipes are kept in memory for an hour, so they can be opened, saved and
 * added to the shopping list like TheMealDB recipes.
 */
@Service
public class OnlineRecipeService {

    static final int PAGE_SIZE = 12;
    static final int MAX_CACHED_SEARCHES = 200;
    static final Duration SEARCH_CACHE_TIME = Duration.ofMinutes(10);
    static final Duration OPTIONS_CACHE_TIME = Duration.ofHours(24);
    static final Duration GENERATED_KEEP_TIME = Duration.ofHours(1);
    static final int MAX_GENERATED_KEPT = 300;
    static final int MAX_GENERATE_REQUEST = 300;
    private static final String GENERATE_SYSTEM = """
            You write recipes for a nutrition app. Reply with only a JSON array of exactly 3 recipes that match the user's request.
            Each recipe is an object with these fields:
            - "name": a short recipe name in English
            - "category": one word, such as Breakfast, Lunch, Dinner, Dessert or Snack
            - "area": the cuisine, such as Italian or Mexican, or an empty string
            - "instructions": an array of short step strings in order
            - "ingredients": an array of objects with "name" and "measure", for example {"name": "Chicken breast", "measure": "150 g"}
            Give amounts for one serving. Use common, realistic ingredients. Do not include any text outside the JSON.
            """;
    private static final int MAX_NAME = 100;
    private static final int MAX_QUANTITY = 40;
    private static final int MAX_SAVED_PAYLOAD = 20000;
    /** Own mapper for the saved snapshot, so the stored JSON does not depend on the app's API settings. */
    private static final ObjectMapper SNAPSHOT = new ObjectMapper();

    private final MealDbClient mealDb;
    private final SavedOnlineRecipeRepository saved;
    private final ShoppingListService shopping;
    private final GeminiClient gemini;
    private final Map<String, CachedValue<List<OnlineRecipe>>> searchCache = new ConcurrentHashMap<>();
    private final Map<Integer, CachedValue<OnlineRecipe>> generatedCache = new ConcurrentHashMap<>();
    private volatile CachedValue<OnlineRecipeOptions> optionsCache;

    public OnlineRecipeService(MealDbClient mealDb, SavedOnlineRecipeRepository saved, ShoppingListService shopping,
                               GeminiClient gemini) {
        this.mealDb = mealDb;
        this.saved = saved;
        this.shopping = shopping;
        this.gemini = gemini;
    }

    /** Asks Gemini for three recipes that match the request. They are kept for an hour so they can be opened and saved. */
    public List<OnlineRecipe> generate(String request) {
        String text = request == null ? "" : request.trim();
        if (text.isEmpty()) {
            throw new InvalidRequestException("Describe the recipe you want.");
        }
        if (text.length() > MAX_GENERATE_REQUEST) {
            throw new InvalidRequestException("The request must be at most " + MAX_GENERATE_REQUEST + " characters.");
        }
        String reply = gemini.completeJson(GENERATE_SYSTEM, "Request: " + text);
        List<OnlineRecipe> recipes = AiRecipeParser.parse(reply);
        if (recipes.isEmpty()) {
            throw new ExternalServiceUnavailableException("The AI did not return usable recipes. Please try again.");
        }
        Instant now = Instant.now();
        if (generatedCache.size() + recipes.size() > MAX_GENERATED_KEPT) {
            generatedCache.clear();
        }
        for (OnlineRecipe recipe : recipes) {
            generatedCache.put(recipe.id(), new CachedValue<>(now, recipe));
        }
        return recipes;
    }

    public OnlineRecipePage search(OnlineRecipeFilters filters, int page) {
        if (page < 1) {
            throw new InvalidRequestException("Page must be 1 or more.");
        }
        if (filters.isEmpty()) {
            throw new InvalidRequestException("Type a name, or choose a category or an area.");
        }
        List<OnlineRecipe> all = matches(filters);
        int total = all.size();
        int lastPage = Math.max(1, (total + PAGE_SIZE - 1) / PAGE_SIZE);
        long offset = (long) (page - 1) * PAGE_SIZE;
        int from = (int) Math.min(offset, total);
        int to = Math.min(from + PAGE_SIZE, total);
        return new OnlineRecipePage(all.subList(from, to), page, lastPage, total);
    }

    /** All matches for one filter, cached briefly. A name search wins over the category and area filters. */
    private List<OnlineRecipe> matches(OnlineRecipeFilters filters) {
        String key;
        if (filters.search() != null) {
            key = "name:" + filters.search().toLowerCase(Locale.ROOT);
        } else if (filters.category() != null) {
            key = "category:" + filters.category();
        } else {
            key = "area:" + filters.area();
        }
        Instant now = Instant.now();
        CachedValue<List<OnlineRecipe>> cached = searchCache.get(key);
        if (cached != null && cached.storedAt().plus(SEARCH_CACHE_TIME).isAfter(now)) {
            return cached.value();
        }

        List<OnlineRecipe> result;
        if (filters.search() != null) {
            result = mealDb.meals("search.php", Map.of("s", filters.search())).stream()
                    .map(OnlineRecipe::fromMeal).toList();
        } else if (filters.category() != null) {
            result = mealDb.meals("filter.php", Map.of("c", filters.category())).stream()
                    .map(OnlineRecipe::fromSummary).toList();
        } else {
            result = mealDb.meals("filter.php", Map.of("a", filters.area())).stream()
                    .map(OnlineRecipe::fromSummary).toList();
        }
        if (searchCache.size() >= MAX_CACHED_SEARCHES) {
            searchCache.clear();
        }
        searchCache.put(key, new CachedValue<>(now, result));
        return result;
    }

    /** The category and area names for the filter dropdowns. Cached for a day. */
    public OnlineRecipeOptions options() {
        Instant now = Instant.now();
        CachedValue<OnlineRecipeOptions> cached = optionsCache;
        if (cached != null && cached.storedAt().plus(OPTIONS_CACHE_TIME).isAfter(now)) {
            return cached.value();
        }
        TreeSet<String> categories = new TreeSet<>();
        for (JsonNode category : mealDb.get("categories.php", Map.of()).path("categories")) {
            String name = OnlineRecipe.text(category, "strCategory").trim();
            if (!name.isEmpty()) {
                categories.add(name);
            }
        }
        TreeSet<String> areas = new TreeSet<>();
        for (JsonNode area : mealDb.meals("list.php", Map.of("a", "list"))) {
            String name = OnlineRecipe.text(area, "strArea").trim();
            if (!name.isEmpty()) {
                areas.add(name);
            }
        }
        OnlineRecipeOptions options = new OnlineRecipeOptions(new ArrayList<>(categories), new ArrayList<>(areas));
        optionsCache = new CachedValue<>(now, options);
        return options;
    }

    public OnlineRecipe random() {
        List<JsonNode> meals = mealDb.meals("random.php", Map.of());
        if (meals.isEmpty()) {
            throw new ResourceNotFoundException("No recipe was found. Please try again.");
        }
        return OnlineRecipe.fromMeal(meals.get(0));
    }

    public OnlineRecipe detail(int id) {
        if (id < 0) {
            return generated(id);
        }
        if (id == 0) {
            throw new ResourceNotFoundException("This online recipe was not found.");
        }
        List<JsonNode> meals = mealDb.meals("lookup.php", Map.of("i", String.valueOf(id)));
        if (meals.isEmpty()) {
            throw new ResourceNotFoundException("This online recipe was not found.");
        }
        return OnlineRecipe.fromMeal(meals.get(0));
    }

    private OnlineRecipe generated(int id) {
        CachedValue<OnlineRecipe> cached = generatedCache.get(id);
        if (cached == null || cached.storedAt().plus(GENERATED_KEEP_TIME).isBefore(Instant.now())) {
            throw new ResourceNotFoundException("This AI recipe has expired. Generate it again.");
        }
        return cached.value();
    }

    @Transactional
    public SavedOnlineRecipeResponse save(UUID userId, int id) {
        Optional<SavedOnlineRecipe> existing = saved.findByUserIdAndExternalId(userId, id);
        if (existing.isPresent()) {
            return toResponse(existing.get());
        }
        OnlineRecipe recipe = detail(id);
        String payload = write(recipe);
        if (payload.length() > MAX_SAVED_PAYLOAD) {
            throw new InvalidRequestException("This recipe is too large to save.");
        }
        SavedOnlineRecipe entity = saved.save(new SavedOnlineRecipe(userId, id, truncate(recipe.name(), 200), payload));
        return toResponse(entity);
    }

    @Transactional(readOnly = true)
    public List<SavedOnlineRecipeResponse> saved(UUID userId) {
        return saved.findByUserIdOrderByNameAsc(userId).stream().map(this::toResponse).toList();
    }

    @Transactional
    public void remove(UUID userId, UUID savedId) {
        SavedOnlineRecipe entity = saved.findByIdAndUserId(savedId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Saved recipe not found."));
        saved.delete(entity);
    }

    /** Adds the chosen ingredients (by position in the list, or all of them) to the shopping list. */
    @Transactional
    public List<ShoppingItemResponse> addToShopping(UUID userId, int id, OnlineRecipeShoppingRequest request) {
        List<OnlineRecipe.Ingredient> ingredients = detail(id).ingredients();
        List<Integer> positions = new ArrayList<>();
        if (request == null || request.ingredientIndexes() == null || request.ingredientIndexes().isEmpty()) {
            for (int i = 0; i < ingredients.size(); i++) {
                positions.add(i);
            }
        } else {
            for (Integer position : request.ingredientIndexes()) {
                if (position == null || position < 0 || position >= ingredients.size()) {
                    throw new InvalidRequestException("This ingredient is not part of the recipe.");
                }
                positions.add(position);
            }
        }

        List<ShoppingItemResponse> added = new ArrayList<>();
        for (int position : positions) {
            OnlineRecipe.Ingredient ingredient = ingredients.get(position);
            if (ingredient.name() == null || ingredient.name().isBlank()) {
                continue;
            }
            String measure = ingredient.measure() == null ? "" : ingredient.measure().trim();
            added.add(shopping.add(userId, new ShoppingItemRequest(
                    truncate(ingredient.name().trim(), MAX_NAME),
                    truncate(measure, MAX_QUANTITY),
                    ShoppingCategory.OTHER,
                    null)));
        }
        if (added.isEmpty()) {
            throw new InvalidRequestException("Choose at least one ingredient of this recipe.");
        }
        return added;
    }

    static String truncate(String value, int max) {
        return value.length() <= max ? value : value.substring(0, max);
    }

    private SavedOnlineRecipeResponse toResponse(SavedOnlineRecipe entity) {
        return new SavedOnlineRecipeResponse(entity.getId(), read(entity.getPayload()));
    }

    private static String write(OnlineRecipe recipe) {
        try {
            return SNAPSHOT.writeValueAsString(recipe);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("A recipe could not be saved as JSON.", e);
        }
    }

    private static OnlineRecipe read(String payload) {
        try {
            return SNAPSHOT.readValue(payload, OnlineRecipe.class);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("A saved recipe could not be read.", e);
        }
    }

    private record CachedValue<T>(Instant storedAt, T value) {
    }
}
