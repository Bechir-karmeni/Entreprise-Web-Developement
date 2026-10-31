package com.dailytracker.nutrition.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

/**
 * Development only (MAIL_MODE=log): no email is sent, the codes are written to the backend console
 * so the sign-up and sign-in flows can be tested without an email account. Never use this in production.
 */
@Service
@ConditionalOnProperty(name = "app.mail.mode", havingValue = "log")
public class LogEmailSender implements EmailSender {

    private static final Logger log = LoggerFactory.getLogger(LogEmailSender.class);

    @Override
    public void sendVerificationCode(String to, String firstName, String code) {
        log.warn("DEVELOPMENT ONLY - no email sent. Confirmation code for {}: {}", to, code);
    }

    @Override
    public void sendSignInCode(String to, String firstName, String code) {
        log.warn("DEVELOPMENT ONLY - no email sent. Sign-in code for {}: {}", to, code);
    }

    @Override
    public void sendPasswordResetCode(String to, String firstName, String code) {
        log.warn("DEVELOPMENT ONLY - no email sent. Password reset code for {}: {}", to, code);
    }

    @Override
    public void sendWelcome(String to, String firstName) {
        log.info("DEVELOPMENT ONLY - welcome email not sent to {}", to);
    }
}
