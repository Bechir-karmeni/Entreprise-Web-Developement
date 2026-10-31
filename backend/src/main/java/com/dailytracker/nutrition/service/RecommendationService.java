package com.dailytracker.nutrition.service;

import com.dailytracker.nutrition.dto.FridgeRecommendation;
import com.dailytracker.nutrition.dto.OnlineFridgeMatch;
import com.dailytracker.nutrition.dto.OwnFridgeMatch;
import com.dailytracker.nutrition.dto.RecipeResponse;
import com.dailytracker.nutrition.dto.RecommendationResponse;
import com.dailytracker.nutrition.exception.ExternalServiceUnavailableException;
import com.dailytracker.nutrition.exception.InvalidRequestException;
import com.dailytracker.nutrition.external.MealDbClient;
import com.dailytracker.nutrition.external.OnlineRecipe;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Supplier;

/**
 * Recommendations without AI. A prompt becomes filter tags (for example HIGH_PROTEIN) and search keywords.
 * Our recipes are filtered by their tags and ranked by the keywords. TheMealDB is searched by name.
 * The fridge ranks recipes by how many of their ingredients are in the fridge.
 */
@Service
public class RecommendationService {

    static final int MAX_RESULTS = 12;
    static final int MAX_KEYWORDS = 2;
    static final int MAX_FRIDGE_LOOKUPS = 4;
    static final int MAX_CACHED = 200;
    static final Duration CACHE_TIME = Duration.ofMinutes(10);
    private static final String ALLERGEN_FREE = "ALLERGEN_FREE";
    private static final Set<String> STOP_WORDS = Set.of(
            "the", "and", "for", "with", "meal", "meals", "recipe", "recipes", "dish", "dinner", "lunch", "breakfast",
            "snack", "high", "low", "under", "quick", "fast", "protein", "vegetarian", "vegan", "free", "allergen",
            "minute", "minutes", "want", "need", "make", "give", "show", "some", "something", "good", "healthy",
            "could", "would", "please", "you", "have", "that", "this", "from", "what", "can", "find", "list", "idea",
            "ideas", "ingredients", "ingredient", "best", "easy", "ready");

    private final RecipeService recipes;
    private final MealDbClient mealDb;
    private final FridgeService fridge;
    private final Map<String, CachedValue> cache = new ConcurrentHashMap<>();

    public RecommendationService(RecipeService recipes, MealDbClient mealDb, FridgeService fridge) {
        this.recipes = recipes;
        this.mealDb = mealDb;
        this.fridge = fridge;
    }

    public RecommendationResponse fromPrompt(String prompt) {
        PromptIntent intent = parse(prompt);
        if (intent.tags().isEmpty() && intent.keywords().isEmpty()) {
            throw new InvalidRequestException("Describe the meal with a few words, for example a main ingredient.");
        }
        return new RecommendationResponse(
                new ArrayList<>(intent.tags()),
                intent.keywords(),
                matchOwn(intent),
                matchOnline(intent));
    }

    public FridgeRecommendation fromFridge(UUID userId) {
        List<String> items = fridge.names(userId);
        if (items.isEmpty()) {
            throw new InvalidRequestException("Add items to your fridge first.");
        }
        List<OwnFridgeMatch> own = recipes.list().stream()
                .map(recipe -> new OwnFridgeMatch(recipe, countMatches(recipe, items), recipe.ingredients().size()))
                .filter(match -> match.matchedIngredients() > 0)
                .sorted(Comparator.comparingInt(OwnFridgeMatch::matchedIngredients).reversed())
                .limit(MAX_RESULTS)
                .toList();
        return new FridgeRecommendation(items, own, matchFridgeOnline(items));
    }

    /** The filter tags and search keywords of a prompt. Tags are the six filters the app knows. */
    record PromptIntent(Set<String> tags, List<String> keywords) {
    }

    static PromptIntent parse(String prompt) {
        String lower = prompt == null ? "" : prompt.toLowerCase(Locale.ROOT);
        Set<String> tags = new LinkedHashSet<>();
        if (lower.contains("protein")) tags.add("HIGH_PROTEIN");
        if (lower.contains("quick") || lower.contains("fast") || lower.contains("minute") || lower.contains("under 21")) {
            tags.add("QUICK");
        }
        if (lower.contains("vegetarian") || lower.contains("vegan")) tags.add("VEGETARIAN");
        if (lower.contains("allergen")) tags.add(ALLERGEN_FREE);

        List<String> keywords = new ArrayList<>();
        for (String word : lower.split("[^a-z]+")) {
            if (word.length() >= 3 && !STOP_WORDS.contains(word) && !keywords.contains(word)) {
                keywords.add(word);
            }
        }
        return new PromptIntent(tags, keywords);
    }

    /** Our recipes with every requested tag, ranked by how many keywords they contain. */
    private List<RecipeResponse> matchOwn(PromptIntent intent) {
        return recipes.list().stream()
                .filter(recipe -> matchesTags(recipe, intent.tags()))
                .map(recipe -> Map.entry(recipe, keywordScore(recipe, intent.keywords())))
                .filter(entry -> intent.keywords().isEmpty() || entry.getValue() > 0)
                .sorted(Map.Entry.<RecipeResponse, Integer>comparingByValue().reversed())
                .limit(MAX_RESULTS)
                .map(Map.Entry::getKey)
                .toList();
    }

    private static boolean matchesTags(RecipeResponse recipe, Set<String> tags) {
        for (String tag : tags) {
            if (ALLERGEN_FREE.equals(tag)) {
                if (!(recipe.allergensKnown() && recipe.allergens().isEmpty())) {
                    return false;
                }
            } else if (!recipe.tags().contains(tag)) {
                return false;
            }
        }
        return true;
    }

    private static int keywordScore(RecipeResponse recipe, List<String> keywords) {
        StringBuilder text = new StringBuilder(recipe.name()).append(' ').append(recipe.description());
        for (var ingredient : recipe.ingredients()) {
            text.append(' ').append(ingredient.foodName());
        }
        String haystack = text.toString().toLowerCase(Locale.ROOT);
        int score = 0;
        for (String keyword : keywords) {
            if (haystack.contains(keyword)) {
                score++;
            }
        }
        return score;
    }

    /** TheMealDB search by each keyword. A vegetarian prompt keeps only recipes in the Vegetarian or Vegan category. */
    private List<OnlineRecipe> matchOnline(PromptIntent intent) {
        if (intent.keywords().isEmpty()) {
            return List.of();
        }
        boolean vegetarian = intent.tags().contains("VEGETARIAN");
        Map<Integer, OnlineRecipe> found = new LinkedHashMap<>();
        try {
            for (String keyword : intent.keywords().subList(0, Math.min(MAX_KEYWORDS, intent.keywords().size()))) {
                for (OnlineRecipe recipe : searchByName(keyword)) {
                    if (vegetarian && !isVegetarian(recipe)) {
                        continue;
                    }
                    found.putIfAbsent(recipe.id(), recipe);
                }
            }
        } catch (ExternalServiceUnavailableException e) {
            // Online results are optional, so our own recipes are still returned.
            return List.of();
        }
        return found.values().stream().limit(MAX_RESULTS).toList();
    }

    private List<OnlineFridgeMatch> matchFridgeOnline(List<String> items) {
        Map<Integer, Integer> counts = new HashMap<>();
        Map<Integer, OnlineRecipe> byId = new HashMap<>();
        try {
            for (String item : items.subList(0, Math.min(MAX_FRIDGE_LOOKUPS, items.size()))) {
                for (OnlineRecipe recipe : filterByIngredient(item)) {
                    counts.merge(recipe.id(), 1, Integer::sum);
                    byId.putIfAbsent(recipe.id(), recipe);
                }
            }
        } catch (ExternalServiceUnavailableException e) {
            return List.of();
        }
        return counts.entrySet().stream()
                .sorted(Map.Entry.<Integer, Integer>comparingByValue().reversed())
                .limit(MAX_RESULTS)
                .map(entry -> new OnlineFridgeMatch(byId.get(entry.getKey()), entry.getValue()))
                .toList();
    }

    static int countMatches(RecipeResponse recipe, List<String> items) {
        int matched = 0;
        for (String item : items) {
            boolean found = recipe.ingredients().stream()
                    .anyMatch(ingredient -> ingredient.foodName().toLowerCase(Locale.ROOT).contains(item));
            if (found) {
                matched++;
            }
        }
        return matched;
    }

    static boolean isVegetarian(OnlineRecipe recipe) {
        String category = recipe.category();
        return category != null && (category.equalsIgnoreCase("Vegetarian") || category.equalsIgnoreCase("Vegan"));
    }

    private List<OnlineRecipe> searchByName(String keyword) {
        return cached("name:" + keyword, () -> mealDb.meals("search.php", Map.of("s", keyword)).stream()
                .map(OnlineRecipe::fromMeal).toList());
    }

    private List<OnlineRecipe> filterByIngredient(String item) {
        return cached("ingredient:" + item, () -> mealDb.meals("filter.php", Map.of("i", item.replace(' ', '_'))).stream()
                .map(OnlineRecipe::fromSummary).toList());
    }

    private List<OnlineRecipe> cached(String key, Supplier<List<OnlineRecipe>> loader) {
        Instant now = Instant.now();
        CachedValue cached = cache.get(key);
        if (cached != null && cached.storedAt().plus(CACHE_TIME).isAfter(now)) {
            return cached.value();
        }
        List<OnlineRecipe> value = loader.get();
        if (cache.size() >= MAX_CACHED) {
            cache.clear();
        }
        cache.put(key, new CachedValue(now, value));
        return value;
    }

    private record CachedValue(Instant storedAt, List<OnlineRecipe> value) {
    }
}
