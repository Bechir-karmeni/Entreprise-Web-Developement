package com.dailytracker.nutrition.dto;

/** Returned after sign-up: no tokens yet, the user must enter the code that was emailed. */
public record PendingVerificationResponse(
        String email,
        long codeValidSeconds,
        long resendAfterSeconds
) {
}
