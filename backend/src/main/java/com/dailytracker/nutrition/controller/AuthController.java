package com.dailytracker.nutrition.controller;

import com.dailytracker.nutrition.dto.AuthResponse;
import com.dailytracker.nutrition.dto.GoogleSignInRequest;
import com.dailytracker.nutrition.dto.LoginRequest;
import com.dailytracker.nutrition.dto.PendingVerificationResponse;
import com.dailytracker.nutrition.dto.RefreshTokenRequest;
import com.dailytracker.nutrition.dto.RegisterRequest;
import com.dailytracker.nutrition.dto.ResetPasswordRequest;
import com.dailytracker.nutrition.dto.ResendCodeRequest;
import com.dailytracker.nutrition.dto.VerifyEmailRequest;
import com.dailytracker.nutrition.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    /** Creates the account and emails a code. No tokens are returned until the email is confirmed. */
    @PostMapping("/register")
    public ResponseEntity<PendingVerificationResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(request));
    }

    @PostMapping("/verify-email")
    public AuthResponse verifyEmail(@Valid @RequestBody VerifyEmailRequest request) {
        return authService.verifyEmail(request);
    }

    @PostMapping("/resend-code")
    public ResponseEntity<Void> resendCode(@Valid @RequestBody ResendCodeRequest request) {
        authService.resendCode(request);
        return ResponseEntity.noContent().build();
    }

    /** Google sign-in step 1: checks the Google token, creates the account if needed, and emails a sign-in code. */
    @PostMapping("/google")
    public PendingVerificationResponse googleSignIn(@Valid @RequestBody GoogleSignInRequest request) {
        return authService.googleSignIn(request.idToken());
    }

    /** Google sign-in step 2: the emailed sign-in code gives the tokens. */
    @PostMapping("/google/verify")
    public AuthResponse googleVerify(@Valid @RequestBody VerifyEmailRequest request) {
        return authService.verifyGoogleCode(request);
    }

    @PostMapping("/google/resend")
    public ResponseEntity<Void> googleResend(@Valid @RequestBody ResendCodeRequest request) {
        authService.resendGoogleCode(request);
        return ResponseEntity.noContent().build();
    }

    /** Emails a code to reset the password. Same answer for every email, so accounts are not revealed. */
    @PostMapping("/password/forgot")
    public ResponseEntity<Void> forgotPassword(@Valid @RequestBody ResendCodeRequest request) {
        authService.requestPasswordReset(request);
        return ResponseEntity.noContent().build();
    }

    /** Sets a new password with the emailed code. The user then logs in with the new password. */
    @PostMapping("/password/reset")
    public ResponseEntity<Void> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @PostMapping("/refresh")
    public AuthResponse refresh(@Valid @RequestBody RefreshTokenRequest request) {
        return authService.refresh(request.refreshToken());
    }

    /**
     * Tokens are stateless, so the server has nothing to revoke yet.
     * The client must delete its tokens. Server-side revocation is a planned improvement.
     */
    @PostMapping("/logout")
    public ResponseEntity<Void> logout() {
        return ResponseEntity.noContent().build();
    }
}
