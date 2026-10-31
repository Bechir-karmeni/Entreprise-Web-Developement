package com.dailytracker.nutrition.external;

import com.dailytracker.nutrition.exception.ExternalServiceUnavailableException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Open Prices (Open Food Facts): recent community-reported prices and the products they belong to.
 * Reading needs no token. Results are cached for six hours to keep requests low.
 */
@Component
public class OpenPricesClient {

    static final String SERVICE_NAME = "Open Prices";
    private static final String PRICES_URL = "https://prices.openfoodfacts.org/api/v1/prices";
    private static final String PRODUCTS_URL = "https://prices.openfoodfacts.org/api/v1/products";
    private static final String USER_AGENT = "DailyTrackerNutrition/0.1 (student project)";
    private static final Duration CACHE_TTL = Duration.ofHours(6);
    private static final int LOOKBACK_DAYS = 365;
    private static final int PAGE_SIZE = 100;
    /** Up to 300 price records are read per lookup, which is enough to cover most stores. */
    private static final int MAX_PAGES = 3;
    private static final int MAX_OFFERS = 8;
    private static final int MAX_PRODUCTS = 10;

    private final HttpClient http = ExternalHttp.client();
    private final ObjectMapper mapper;
    private final Map<String, CachedOffers> cache = new ConcurrentHashMap<>();
    private final Map<String, CachedProducts> productCache = new ConcurrentHashMap<>();

    /** A product known to Open Prices, with the number of prices recorded for it. */
    public record PriceProduct(String code, String name, int priceCount) {
    }

    private record CachedOffers(Instant fetchedAt, List<PriceOffer> offers) {
    }

    private record CachedProducts(Instant fetchedAt, List<PriceProduct> products) {
    }

    public OpenPricesClient(ObjectMapper mapper) {
        this.mapper = mapper;
    }

    /** Recent euro prices for one barcode, latest price per store branch, cheapest first. Empty when none are known. */
    public List<PriceOffer> offersFor(String barcode) {
        return lookup("code:" + barcode, "product_code", barcode);
    }

    /**
     * Products whose name contains the given text and that have at least one price, most-priced first.
     * Their barcodes can then be used with {@link #offersFor(String)}.
     */
    public List<PriceProduct> productsNamed(String name) {
        String text = name.trim();
        String key = text.toLowerCase();
        CachedProducts cached = productCache.get(key);
        if (cached != null && cached.fetchedAt().plus(CACHE_TTL).isAfter(Instant.now())) {
            return cached.products();
        }
        String url = PRODUCTS_URL
                + "?product_name__like=" + URLEncoder.encode(text, StandardCharsets.UTF_8)
                + "&price_count__gte=1&size=" + MAX_PRODUCTS;
        JsonNode root = readPage(url);
        List<PriceProduct> products = new ArrayList<>();
        for (JsonNode item : root.path("items")) {
            String code = item.path("code").asText("").trim();
            String productName = item.path("product_name").asText("").trim();
            if (code.isBlank() || productName.isBlank()) {
                continue;
            }
            products.add(new PriceProduct(code, productName, item.path("price_count").asInt(0)));
        }
        products.sort(Comparator.comparingInt(PriceProduct::priceCount).reversed());
        productCache.put(key, new CachedProducts(Instant.now(), products));
        return products;
    }

    private List<PriceOffer> lookup(String cacheKey, String filterName, String filterValue) {
        CachedOffers cached = cache.get(cacheKey);
        if (cached != null && cached.fetchedAt().plus(CACHE_TTL).isAfter(Instant.now())) {
            return cached.offers();
        }
        String since = LocalDate.now().minusDays(LOOKBACK_DAYS).toString();
        List<JsonNode> pages = new ArrayList<>();
        for (int page = 1; page <= MAX_PAGES; page++) {
            String url = PRICES_URL
                    + "?" + filterName + "=" + URLEncoder.encode(filterValue, StandardCharsets.UTF_8)
                    + "&currency=EUR&date__gte=" + since + "&size=" + PAGE_SIZE + "&page=" + page;
            JsonNode root = readPage(url);
            pages.add(root);
            if (page >= root.path("pages").asInt(1)) {
                break;
            }
        }
        List<PriceOffer> offers = offersFrom(pages);
        cache.put(cacheKey, new CachedOffers(Instant.now(), offers));
        return offers;
    }

    private JsonNode readPage(String url) {
        String body;
        try {
            body = ExternalHttp.get(http, URI.create(url), SERVICE_NAME, Map.of("User-Agent", USER_AGENT));
        } catch (ExternalFoodException e) {
            throw new ExternalServiceUnavailableException(SERVICE_NAME + " is not reachable right now.");
        }
        try {
            return mapper.readTree(body);
        } catch (IOException e) {
            throw new ExternalServiceUnavailableException(SERVICE_NAME + " returned unreadable data.");
        }
    }

    static List<PriceOffer> offersFrom(JsonNode root) {
        return offersFrom(List.of(root));
    }

    /**
     * Keeps euro prices only, the newest price for each store branch, cheapest first, at most eight.
     * Dates are ISO yyyy-mm-dd, so comparing them as text gives the newest one.
     */
    static List<PriceOffer> offersFrom(List<JsonNode> pages) {
        Map<String, PriceOffer> newestPerBranch = new LinkedHashMap<>();
        for (JsonNode root : pages) {
            for (JsonNode item : root.path("items")) {
                if (!"EUR".equals(item.path("currency").asText(""))) {
                    continue;
                }
                JsonNode price = item.path("price");
                JsonNode location = item.path("location");
                String store = location.path("osm_name").asText("").trim();
                if (!price.isNumber() || store.isBlank()) {
                    continue;
                }
                String brand = location.path("osm_brand").asText("").trim();
                PriceOffer offer = new PriceOffer(
                        store,
                        brand.isBlank() ? null : brand,
                        (int) Math.round(price.asDouble() * 100),
                        item.path("date").asText(""),
                        item.path("price_is_discounted").asBoolean(false),
                        null);
                String branch = location.path("id").asText(store);
                PriceOffer previous = newestPerBranch.get(branch);
                if (previous == null || offer.date().compareTo(previous.date()) > 0) {
                    newestPerBranch.put(branch, offer);
                }
            }
        }
        return newestPerBranch.values().stream()
                .sorted(Comparator.comparingInt(PriceOffer::priceCents))
                .limit(MAX_OFFERS)
                .toList();
    }
}
