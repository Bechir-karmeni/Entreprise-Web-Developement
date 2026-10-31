package com.dailytracker.nutrition.service;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;

import com.dailytracker.nutrition.exception.InvalidRequestException;
import com.dailytracker.nutrition.external.OpenFoodFactsClient;
import com.dailytracker.nutrition.external.UsdaFoodClient;
import java.time.Clock;
import org.junit.jupiter.api.Test;

class ExternalFoodBarcodeTest {

    private final ExternalFoodService service = new ExternalFoodService(
            mock(OpenFoodFactsClient.class), mock(UsdaFoodClient.class), mock(FoodImporter.class), Clock.systemUTC());

    @Test
    void rejectsTooShortBarcode() {
        assertThrows(InvalidRequestException.class, () -> service.lookupBarcode("12345"));
    }

    @Test
    void rejectsLettersInBarcode() {
        assertThrows(InvalidRequestException.class, () -> service.lookupBarcode("4006ab81333931"));
    }
}
