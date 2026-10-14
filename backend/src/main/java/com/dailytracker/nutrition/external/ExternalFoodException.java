package com.dailytracker.nutrition.external;

/** An online food source could not be used. The message is safe to show to users. */
public class ExternalFoodException extends RuntimeException {
    public ExternalFoodException(String message) {
        super(message);
    }
}
