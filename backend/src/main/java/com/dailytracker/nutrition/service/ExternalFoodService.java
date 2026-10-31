package com.dailytracker.nutrition.service;

import com.dailytracker.nutrition.dto.FoodResponse;
import com.dailytracker.nutrition.exception.ExternalServiceUnavailableException;
import com.dailytracker.nutrition.exception.InvalidRequestException;
import com.dailytracker.nutrition.exception.RateLimitedException;
import com.dailytracker.nutrition.exception.ResourceNotFoundException;
import com.dailytracker.nutrition.external.ExternalFood;
import com.dailytracker.nutrition.external.ExternalFoodException;
import com.dailytracker.nutrition.external.OpenFoodFactsClient;
import com.dailytracker.nutrition.external.UsdaFoodClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;

/**
 * Searches the online food sources, saves the results, and caches each search for a few minutes.
 * All external calls go through one throttle, because Open Food Facts allows 10 searches per minute.
 */
@Service
public class ExternalFoodService {

    static final int MIN_QUERY_LENGTH = 3;
    static final int MAX_QUERY_LENGTH = 100;
    static final int RESULTS_PER_SOURCE = 10;
    static final Duration MIN_INTERVAL_BETWEEN_CALLS = Duration.ofSeconds(6);
    static final Duration CACHE_TIME = Duration.ofMinutes(10);
    static final Pattern BARCODE = Pattern.compile("\\d{6,14}");

    private static final Logger log = LoggerFactory.getLogger(ExternalFoodService.class);

    private final OpenFoodFactsClient openFoodFacts;
    private final UsdaFoodClient usda;
    private final FoodImporter importer;
    private final Clock clock;
    private final Map<String, CachedSearch> cache = new ConcurrentHashMap<>();
    private Instant lastExternalCall = Instant.EPOCH;

    public ExternalFoodService(OpenFoodFactsClient openFoodFacts, UsdaFoodClient usda,
                               FoodImporter importer, Clock clock) {
        this.openFoodFacts = openFoodFacts;
        this.usda = usda;
        this.importer = importer;
        this.clock = clock;
    }

    public List<FoodResponse> search(String query) {
        String text = query == null ? "" : query.trim();
        if (text.length() < MIN_QUERY_LENGTH) {
            throw new InvalidRequestException("Type at least 3 characters to search online.");
        }
        if (text.length() > MAX_QUERY_LENGTH) {
            throw new InvalidRequestException("Search text must be at most 100 characters.");
        }

        String key = text.toLowerCase(Locale.ROOT);
        Instant now = clock.instant();
        CachedSearch cached = cache.get(key);
        if (cached != null && cached.storedAt().plus(CACHE_TIME).isAfter(now)) {
            return cached.foods();
        }

        reserveExternalCall(now);
        List<ExternalFood> fetched = new ArrayList<>();
        boolean anySourceAnswered = false;

        try {
            fetched.addAll(openFoodFacts.search(text, RESULTS_PER_SOURCE));
            anySourceAnswered = true;
        } catch (ExternalFoodException e) {
            // Only the exception type is logged, never the request URL (it can contain an API key).
            log.warn("Open Food Facts search failed: {}", e.getMessage());
        }

        if (usda.isConfigured()) {
            try {
                fetched.addAll(usda.search(text, RESULTS_PER_SOURCE));
                anySourceAnswered = true;
            } catch (ExternalFoodException e) {
                log.warn("USDA search failed: {}", e.getMessage());
            }
        }

        if (!anySourceAnswered) {
            throw new ExternalServiceUnavailableException("The online food database is not available right now.");
        }

        List<FoodResponse> result = importer.upsert(fetched);
        cache.put(key, new CachedSearch(now, result));
        return result;
    }

    /**
     * Looks up one product by its barcode in Open Food Facts, saves it, and returns it. Barcodes are 6 to 14 digits;
     * spaces are ignored. Shares the same throttle as the search.
     */
    public FoodResponse lookupBarcode(String code) {
        String digits = code == null ? "" : code.replaceAll("\\s", "");
        if (!BARCODE.matcher(digits).matches()) {
            throw new InvalidRequestException("A barcode has 6 to 14 digits.");
        }

        reserveExternalCall(clock.instant());
        ExternalFood product;
        try {
            product = openFoodFacts.lookup(digits)
                    .orElseThrow(() -> new ResourceNotFoundException("No product with this barcode was found."));
        } catch (ExternalFoodException e) {
            log.warn("Open Food Facts barcode lookup failed: {}", e.getMessage());
            throw new ExternalServiceUnavailableException("The product database is not available right now.");
        }
        return importer.upsert(List.of(product)).get(0);
    }

    private synchronized void reserveExternalCall(Instant now) {
        if (Duration.between(lastExternalCall, now).compareTo(MIN_INTERVAL_BETWEEN_CALLS) < 0) {
            throw new RateLimitedException("Please wait a few seconds before searching online again.");
        }
        lastExternalCall = now;
    }

    private record CachedSearch(Instant storedAt, List<FoodResponse> foods) {
    }
}
