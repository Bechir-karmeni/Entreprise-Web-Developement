package com.dailytracker.nutrition.service;

/**
 * Sends the emails of the sign-in flows. Implementations: SMTP (real email) or log (development).
 * The welcome email is sent once, when a new account is confirmed (email code or Google).
 */
public interface EmailSender {

    /** Confirmation code after sign-up with a password. */
    void sendVerificationCode(String to, String firstName, String code);

    /** Sign-in code after signing in with Google. */
    void sendSignInCode(String to, String firstName, String code);

    /** Code to set a new password. */
    void sendPasswordResetCode(String to, String firstName, String code);

    /** Welcome email, sent once when a new account is confirmed. A failure here never stops the sign-in. */
    void sendWelcome(String to, String firstName);
}
