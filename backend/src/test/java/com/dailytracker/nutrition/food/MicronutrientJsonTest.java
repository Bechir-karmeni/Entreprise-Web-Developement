package com.dailytracker.nutrition.food;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import java.util.Map;
import org.junit.jupiter.api.Test;

class MicronutrientJsonTest {

    @Test
    void roundTripsTheValues() {
        String json = MicronutrientJson.write(Map.of("IRON", 3.3));

        assertEquals(3.3, MicronutrientJson.read(json).get("IRON").doubleValue());
    }

    @Test
    void noValuesMeansNoData() {
        assertNull(MicronutrientJson.write(Map.of()));
        assertNull(MicronutrientJson.write(null));
        assertNull(MicronutrientJson.read(null));
        assertNull(MicronutrientJson.read("   "));
    }

    @Test
    void unreadableTextIsTreatedAsNoData() {
        assertNull(MicronutrientJson.read("{not json"));
    }

    @Test
    void scalesThePer100gValuesToThePortion() {
        Map<String, Double> scaled = MicronutrientJson.scale(Map.of("IRON", 7.5), 1.5);

        assertEquals(11.25, scaled.get("IRON").doubleValue());
    }

    @Test
    void scalingNoDataGivesNoData() {
        assertNull(MicronutrientJson.scale(null, 2));
    }
}
