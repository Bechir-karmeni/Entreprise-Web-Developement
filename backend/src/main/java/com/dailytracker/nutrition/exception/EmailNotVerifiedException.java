package com.dailytracker.nutrition.exception;

/** Thrown at login when the password is correct but the email has not been confirmed yet. */
public class EmailNotVerifiedException extends RuntimeException {
    public EmailNotVerifiedException() {
        super("Please confirm your email before you log in.");
    }
}
