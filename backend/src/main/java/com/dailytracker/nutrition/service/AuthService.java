package com.dailytracker.nutrition.service;

import com.dailytracker.nutrition.dto.AuthResponse;
import com.dailytracker.nutrition.dto.LoginRequest;
import com.dailytracker.nutrition.dto.PendingVerificationResponse;
import com.dailytracker.nutrition.dto.RegisterRequest;
import com.dailytracker.nutrition.dto.ResetPasswordRequest;
import com.dailytracker.nutrition.dto.ResendCodeRequest;
import com.dailytracker.nutrition.dto.UserSummary;
import com.dailytracker.nutrition.dto.VerifyEmailRequest;
import com.dailytracker.nutrition.entity.EmailVerificationCode;
import com.dailytracker.nutrition.entity.User;
import com.dailytracker.nutrition.exception.EmailAlreadyRegisteredException;
import com.dailytracker.nutrition.exception.EmailNotVerifiedException;
import com.dailytracker.nutrition.exception.InvalidRequestException;
import com.dailytracker.nutrition.exception.InvalidTokenException;
import com.dailytracker.nutrition.exception.RateLimitedException;
import com.dailytracker.nutrition.repository.EmailVerificationCodeRepository;
import com.dailytracker.nutrition.repository.UserRepository;
import com.dailytracker.nutrition.security.JwtService;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

@Service
public class AuthService {

    private static final String TOKEN_TYPE = "Bearer";

    /** How long a confirmation or sign-in code stays valid. */
    static final Duration CODE_VALIDITY = Duration.ofMinutes(15);
    /** Minimum time between two code emails for the same account. */
    static final Duration RESEND_COOLDOWN = Duration.ofSeconds(60);
    /** Wrong code attempts allowed before the user must request a new code. */
    static final int MAX_ATTEMPTS = 5;

    private static final SecureRandom RANDOM = new SecureRandom();

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final EmailVerificationCodeRepository codeRepository;
    private final EmailSender emailSender;
    private final GoogleTokenVerifier googleVerifier;

    public AuthService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       AuthenticationManager authenticationManager,
                       JwtService jwtService,
                       EmailVerificationCodeRepository codeRepository,
                       EmailSender emailSender,
                       GoogleTokenVerifier googleVerifier) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.codeRepository = codeRepository;
        this.emailSender = emailSender;
        this.googleVerifier = googleVerifier;
    }

    /**
     * Creates the account without logging it in and emails a confirmation code.
     * If the email cannot be sent, the account is not kept, so the user can try again.
     */
    @Transactional
    public PendingVerificationResponse register(RegisterRequest request) {
        if (!request.password().equals(request.confirmPassword())) {
            throw new InvalidRequestException("Passwords do not match.");
        }
        String email = normalizeEmail(request.email());
        if (userRepository.existsByEmail(email)) {
            throw new EmailAlreadyRegisteredException();
        }
        User user = new User(
                request.firstName().trim(),
                request.lastName().trim(),
                email,
                passwordEncoder.encode(request.password()));
        userRepository.save(user);
        String code = storeNewCode(user);
        emailSender.sendVerificationCode(user.getEmail(), user.getFirstName(), code);
        return pending(user);
    }

    /**
     * Checks the emailed code. On success the email is confirmed and the user gets tokens.
     * Each wrong code is counted, and the counter is saved before the error is thrown.
     */
    public AuthResponse verifyEmail(VerifyEmailRequest request) {
        User user = userRepository.findByEmail(normalizeEmail(request.email()))
                .orElseThrow(() -> new InvalidRequestException("The code is not valid."));
        if (user.isEmailVerified()) {
            throw new InvalidRequestException("This email is already confirmed. Please log in.");
        }
        consumeCode(user, request.code());
        user.markEmailVerified();
        userRepository.save(user);
        emailSender.sendWelcome(user.getEmail(), user.getFirstName());
        return issueTokens(user);
    }

    /**
     * Sends a new confirmation code. Unknown or already confirmed emails get the same silent answer,
     * so the endpoint does not reveal which accounts exist.
     */
    @Transactional
    public void resendCode(ResendCodeRequest request) {
        Optional<User> found = userRepository.findByEmail(normalizeEmail(request.email()));
        if (found.isEmpty() || found.get().isEmailVerified()) {
            return;
        }
        User user = found.get();
        checkCooldown(user);
        String code = storeNewCode(user);
        emailSender.sendVerificationCode(user.getEmail(), user.getFirstName(), code);
    }

    /**
     * Signs in with a Google account. Google has already confirmed the email address, so a new account
     * is created with it (and gets a welcome email). The user then receives a sign-in code by email,
     * which is entered in the app to finish signing in.
     */
    @Transactional
    public PendingVerificationResponse googleSignIn(String idToken) {
        GoogleTokenVerifier.GoogleProfile profile = googleVerifier.verify(idToken);
        User user = userRepository.findByEmail(profile.email()).orElse(null);
        if (user == null) {
            // Nobody can log in with this random password. Google sign-in is the only way in for these accounts.
            user = new User(profile.firstName(), profile.lastName(), profile.email(),
                    passwordEncoder.encode(UUID.randomUUID().toString()));
            user.markEmailVerified();
            userRepository.save(user);
            emailSender.sendWelcome(user.getEmail(), user.getFirstName());
        } else if (!user.isEmailVerified()) {
            user.markEmailVerified();
            userRepository.save(user);
        }
        String code = storeNewCode(user);
        emailSender.sendSignInCode(user.getEmail(), user.getFirstName(), code);
        return pending(user);
    }

    /** Checks the sign-in code sent after a Google sign-in. Wrong attempts are counted, as for sign-up. */
    public AuthResponse verifyGoogleCode(VerifyEmailRequest request) {
        User user = userRepository.findByEmail(normalizeEmail(request.email()))
                .orElseThrow(() -> new InvalidRequestException("The code is not valid."));
        consumeCode(user, request.code());
        return issueTokens(user);
    }

    /** Sends a new sign-in code after a Google sign-in. Unknown emails get a silent answer. */
    @Transactional
    public void resendGoogleCode(ResendCodeRequest request) {
        Optional<User> found = userRepository.findByEmail(normalizeEmail(request.email()));
        if (found.isEmpty()) {
            return;
        }
        User user = found.get();
        checkCooldown(user);
        String code = storeNewCode(user);
        emailSender.sendSignInCode(user.getEmail(), user.getFirstName(), code);
    }

    /**
     * Emails a code to reset the password. Unknown emails get the same silent answer,
     * so the endpoint does not reveal which accounts exist.
     */
    @Transactional
    public void requestPasswordReset(ResendCodeRequest request) {
        Optional<User> found = userRepository.findByEmail(normalizeEmail(request.email()));
        if (found.isEmpty()) {
            return;
        }
        User user = found.get();
        checkCooldown(user);
        String code = storeNewCode(user);
        emailSender.sendPasswordResetCode(user.getEmail(), user.getFirstName(), code);
    }

    /**
     * Sets a new password with the emailed code. Not transactional, so a wrong code's attempt
     * is saved even though the request fails (same reason as verifyEmail).
     * Proving the code also proves the email, so the account is confirmed too.
     */
    public void resetPassword(ResetPasswordRequest request) {
        if (!request.password().equals(request.confirmPassword())) {
            throw new InvalidRequestException("Passwords do not match.");
        }
        User user = userRepository.findByEmail(normalizeEmail(request.email()))
                .orElseThrow(() -> new InvalidRequestException("The code is not valid."));
        consumeCode(user, request.code());
        user.changePasswordHash(passwordEncoder.encode(request.password()));
        user.markEmailVerified();
        userRepository.save(user);
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        String email = normalizeEmail(request.email());
        // Throws BadCredentialsException when the email is unknown or the password is wrong.
        authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(email, request.password()));
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password."));
        if (!user.isEmailVerified()) {
            throw new EmailNotVerifiedException();
        }
        return issueTokens(user);
    }

    @Transactional(readOnly = true)
    public AuthResponse refresh(String refreshToken) {
        UUID userId = jwtService.extractRefreshUserId(refreshToken);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new InvalidTokenException("Invalid or expired token."));
        return issueTokens(user);
    }

    /** Checks the stored code for this user: expiry, attempts, and the hash. On success the code is used up. */
    private void consumeCode(User user, String code) {
        EmailVerificationCode stored = codeRepository.findFirstByUserIdOrderByCreatedAtDesc(user.getId())
                .orElseThrow(() -> new InvalidRequestException("The code is not valid. Request a new one."));
        if (stored.getExpiresAt().isBefore(Instant.now())) {
            throw new InvalidRequestException("The code has expired. Request a new one.");
        }
        if (stored.getAttempts() >= MAX_ATTEMPTS) {
            throw new InvalidRequestException("Too many wrong attempts. Request a new code.");
        }
        if (!passwordEncoder.matches(code, stored.getCodeHash())) {
            stored.registerFailedAttempt();
            codeRepository.save(stored);
            throw new InvalidRequestException("The code is not valid.");
        }
        codeRepository.deleteByUserId(user.getId());
    }

    private void checkCooldown(User user) {
        Optional<EmailVerificationCode> last = codeRepository.findFirstByUserIdOrderByCreatedAtDesc(user.getId());
        if (last.isPresent() && last.get().getCreatedAt().plus(RESEND_COOLDOWN).isAfter(Instant.now())) {
            throw new RateLimitedException("Please wait a minute before requesting a new code.");
        }
    }

    /** Replaces any earlier code, stores the hash of a new 6-digit code, and returns the plain code to email. */
    private String storeNewCode(User user) {
        String code = String.format(Locale.ROOT, "%06d", RANDOM.nextInt(1_000_000));
        codeRepository.deleteByUserId(user.getId());
        codeRepository.save(new EmailVerificationCode(
                user.getId(),
                passwordEncoder.encode(code),
                Instant.now().plus(CODE_VALIDITY)));
        return code;
    }

    private static PendingVerificationResponse pending(User user) {
        return new PendingVerificationResponse(
                user.getEmail(),
                CODE_VALIDITY.toSeconds(),
                RESEND_COOLDOWN.toSeconds());
    }

    private AuthResponse issueTokens(User user) {
        return new AuthResponse(
                jwtService.generateAccessToken(user.getId()),
                jwtService.generateRefreshToken(user.getId()),
                TOKEN_TYPE,
                jwtService.getAccessExpirationSeconds(),
                UserSummary.from(user));
    }

    private static String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
