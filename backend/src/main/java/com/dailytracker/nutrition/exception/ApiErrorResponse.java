package com.dailytracker.nutrition.exception;

import com.fasterxml.jackson.annotation.JsonInclude;
import org.springframework.http.HttpStatus;

import java.time.Instant;
import java.util.Map;

/** Consistent error body returned by every failing API call. Never contains stack traces. */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiErrorResponse(
        boolean success,
        String message,
        Instant timestamp,
        int status,
        Map<String, String> errors
) {
    public static ApiErrorResponse of(HttpStatus status, String message, Map<String, String> errors) {
        return new ApiErrorResponse(false, message, Instant.now(), status.value(), errors);
    }
}
