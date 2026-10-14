package com.dailytracker.nutrition.external;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Map;

/**
 * Shared HTTP call for the food sources. Error messages never include the request URL,
 * because some URLs contain an API key.
 */
final class ExternalHttp {

    private ExternalHttp() {
    }

    static HttpClient client() {
        return HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
    }

    static String get(HttpClient client, URI uri, String serviceName, Map<String, String> headers) {
        HttpRequest.Builder builder = HttpRequest.newBuilder(uri)
                .timeout(Duration.ofSeconds(10))
                .header("Accept", "application/json")
                .GET();
        headers.forEach(builder::header);

        HttpResponse<String> response;
        try {
            response = client.send(builder.build(), HttpResponse.BodyHandlers.ofString());
        } catch (IOException e) {
            throw new ExternalFoodException(serviceName + " could not be reached.");
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new ExternalFoodException(serviceName + " request was interrupted.");
        }
        if (response.statusCode() != 200) {
            throw new ExternalFoodException(serviceName + " returned HTTP " + response.statusCode() + ".");
        }
        return response.body();
    }
}
