package com.dailytracker.nutrition.external;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import org.junit.jupiter.api.Test;

class OpenPricesClientTest {

    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void keepsTheNewestPricePerBranchAndSortsCheapestFirst() throws Exception {
        String json = """
                {"items":[
                  {"currency":"EUR","price":3.21,"date":"2024-01-11","price_is_discounted":false,
                   "location":{"id":33,"osm_name":"Carrefour Villeurbanne","osm_brand":"Carrefour"}},
                  {"currency":"EUR","price":3.10,"date":"2025-02-01","price_is_discounted":true,
                   "location":{"id":33,"osm_name":"Carrefour Villeurbanne","osm_brand":"Carrefour"}},
                  {"currency":"EUR","price":2.99,"date":"2024-01-29","price_is_discounted":false,
                   "location":{"id":95,"osm_name":"Carrefour Market","osm_brand":"Carrefour Market"}},
                  {"currency":"USD","price":9.99,"date":"2025-03-01","price_is_discounted":false,
                   "location":{"id":127,"osm_name":"Super U","osm_brand":"Super U"}}
                ],"page":1,"pages":1,"size":5,"total":4}
                """;

        List<PriceOffer> offers = OpenPricesClient.offersFrom(mapper.readTree(json));

        assertThat(offers).containsExactly(
                new PriceOffer("Carrefour Market", "Carrefour Market", 299, "2024-01-29", false, null),
                new PriceOffer("Carrefour Villeurbanne", "Carrefour", 310, "2025-02-01", true, null));
    }

    @Test
    void returnsNothingWhenNoEuroPriceExists() throws Exception {
        String json = "{\"items\":[],\"page\":1,\"pages\":0,\"size\":100,\"total\":0}";

        assertThat(OpenPricesClient.offersFrom(mapper.readTree(json))).isEmpty();
    }
}
