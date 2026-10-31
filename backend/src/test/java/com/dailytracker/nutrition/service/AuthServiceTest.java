package com.dailytracker.nutrition.service;

import com.dailytracker.nutrition.dto.AuthResponse;
import com.dailytracker.nutrition.dto.LoginRequest;
import com.dailytracker.nutrition.dto.PendingVerificationResponse;
import com.dailytracker.nutrition.dto.RegisterRequest;
import com.dailytracker.nutrition.dto.VerifyEmailRequest;
import com.dailytracker.nutrition.dto.ResendCodeRequest;
import com.dailytracker.nutrition.dto.ResetPasswordRequest;
import com.dailytracker.nutrition.entity.EmailVerificationCode;
import com.dailytracker.nutrition.entity.User;
import com.dailytracker.nutrition.exception.EmailAlreadyRegisteredException;
import com.dailytracker.nutrition.exception.EmailNotVerifiedException;
import com.dailytracker.nutrition.exception.InvalidRequestException;
import com.dailytracker.nutrition.repository.EmailVerificationCodeRepository;
import com.dailytracker.nutrition.repository.UserRepository;
import com.dailytracker.nutrition.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private AuthenticationManager authenticationManager;

    @Mock
    private JwtService jwtService;

    @Mock
    private EmailVerificationCodeRepository codeRepository;

    @Mock
    private EmailSender emailSender;

    @Mock
    private GoogleTokenVerifier googleVerifier;

    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder(4);

    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(userRepository, passwordEncoder, authenticationManager, jwtService,
                codeRepository, emailSender, googleVerifier);
    }

    @Test
    void registerCreatesUnverifiedUserAndSendsCodeWithoutTokens() {
        when(userRepository.existsByEmail("ada@example.com")).thenReturn(false);

        PendingVerificationResponse response = authService.register(
                new RegisterRequest("Ada", "Lovelace", "  Ada@Example.com ", "secret123", "secret123"));

        ArgumentCaptor<User> saved = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(saved.capture());
        assertThat(saved.getValue().getEmail()).isEqualTo("ada@example.com");
        assertThat(saved.getValue().isEmailVerified()).isFalse();
        assertThat(passwordEncoder.matches("secret123", saved.getValue().getPasswordHash())).isTrue();
        verify(emailSender).sendVerificationCode(eq("ada@example.com"), eq("Ada"), anyString());
        assertThat(response.email()).isEqualTo("ada@example.com");
        assertThat(response.codeValidSeconds()).isEqualTo(15 * 60);
    }

    @Test
    void registerRejectsDuplicateEmail() {
        when(userRepository.existsByEmail("ada@example.com")).thenReturn(true);

        assertThatThrownBy(() -> authService.register(
                new RegisterRequest("Ada", "Lovelace", "ada@example.com", "secret123", "secret123")))
                .isInstanceOf(EmailAlreadyRegisteredException.class);

        verify(userRepository, never()).save(any(User.class));
        verify(emailSender, never()).sendVerificationCode(anyString(), anyString(), anyString());
    }

    @Test
    void registerRejectsMismatchedPasswords() {
        assertThatThrownBy(() -> authService.register(
                new RegisterRequest("Ada", "Lovelace", "ada@example.com", "secret123", "different1")))
                .isInstanceOf(InvalidRequestException.class);

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void verifyEmailWithCorrectCodeMarksAccountAndReturnsTokens() {
        User user = new User("Ada", "Lovelace", "ada@example.com", passwordEncoder.encode("secret123"));
        EmailVerificationCode stored = new EmailVerificationCode(
                user.getId(), passwordEncoder.encode("123456"), Instant.now().plus(15, ChronoUnit.MINUTES));
        when(userRepository.findByEmail("ada@example.com")).thenReturn(Optional.of(user));
        when(codeRepository.findFirstByUserIdOrderByCreatedAtDesc(user.getId())).thenReturn(Optional.of(stored));
        when(jwtService.generateAccessToken(user.getId())).thenReturn("access-token");
        when(jwtService.generateRefreshToken(user.getId())).thenReturn("refresh-token");
        when(jwtService.getAccessExpirationSeconds()).thenReturn(900L);

        AuthResponse response = authService.verifyEmail(new VerifyEmailRequest("ada@example.com", "123456"));

        assertThat(user.isEmailVerified()).isTrue();
        verify(codeRepository).deleteByUserId(user.getId());
        verify(emailSender).sendWelcome("ada@example.com", "Ada");
        assertThat(response.accessToken()).isEqualTo("access-token");
    }

    @Test
    void verifyEmailWithWrongCodeCountsTheAttemptAndFails() {
        User user = new User("Ada", "Lovelace", "ada@example.com", passwordEncoder.encode("secret123"));
        EmailVerificationCode stored = new EmailVerificationCode(
                user.getId(), passwordEncoder.encode("123456"), Instant.now().plus(15, ChronoUnit.MINUTES));
        when(userRepository.findByEmail("ada@example.com")).thenReturn(Optional.of(user));
        when(codeRepository.findFirstByUserIdOrderByCreatedAtDesc(user.getId())).thenReturn(Optional.of(stored));

        assertThatThrownBy(() -> authService.verifyEmail(new VerifyEmailRequest("ada@example.com", "000000")))
                .isInstanceOf(InvalidRequestException.class);

        assertThat(stored.getAttempts()).isEqualTo(1);
        verify(codeRepository).save(stored);
        assertThat(user.isEmailVerified()).isFalse();
    }

    @Test
    void resetPasswordWithCorrectCodeChangesPasswordAndConfirmsEmail() {
        User user = new User("Ada", "Lovelace", "ada@example.com", passwordEncoder.encode("oldpass1"));
        EmailVerificationCode stored = new EmailVerificationCode(
                user.getId(), passwordEncoder.encode("123456"), Instant.now().plus(15, ChronoUnit.MINUTES));
        when(userRepository.findByEmail("ada@example.com")).thenReturn(Optional.of(user));
        when(codeRepository.findFirstByUserIdOrderByCreatedAtDesc(user.getId())).thenReturn(Optional.of(stored));

        authService.resetPassword(new ResetPasswordRequest("ada@example.com", "123456", "newpass123", "newpass123"));

        assertThat(passwordEncoder.matches("newpass123", user.getPasswordHash())).isTrue();
        assertThat(user.isEmailVerified()).isTrue();
        verify(codeRepository).deleteByUserId(user.getId());
    }

    @Test
    void requestPasswordResetIsSilentForUnknownEmail() {
        when(userRepository.findByEmail("nobody@example.com")).thenReturn(Optional.empty());

        authService.requestPasswordReset(new ResendCodeRequest("nobody@example.com"));

        verify(emailSender, never()).sendPasswordResetCode(anyString(), anyString(), anyString());
    }

    @Test
    void loginWithWrongPasswordIsRejected() {
        when(authenticationManager.authenticate(any()))
                .thenThrow(new BadCredentialsException("Bad credentials"));

        assertThatThrownBy(() -> authService.login(new LoginRequest("ada@example.com", "wrong-pass1")))
                .isInstanceOf(BadCredentialsException.class);
    }

    @Test
    void loginIsRejectedUntilEmailIsVerified() {
        User user = new User("Ada", "Lovelace", "ada@example.com", passwordEncoder.encode("secret123"));
        when(userRepository.findByEmail("ada@example.com")).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> authService.login(new LoginRequest("ada@example.com", "secret123")))
                .isInstanceOf(EmailNotVerifiedException.class);
    }

    @Test
    void loginWithCorrectPasswordReturnsTokens() {
        User user = new User("Ada", "Lovelace", "ada@example.com", passwordEncoder.encode("secret123"));
        user.markEmailVerified();
        when(userRepository.findByEmail("ada@example.com")).thenReturn(Optional.of(user));
        when(jwtService.generateAccessToken(user.getId())).thenReturn("access-token");
        when(jwtService.generateRefreshToken(user.getId())).thenReturn("refresh-token");
        when(jwtService.getAccessExpirationSeconds()).thenReturn(900L);

        AuthResponse response = authService.login(new LoginRequest("ADA@example.com", "secret123"));

        assertThat(response.accessToken()).isEqualTo("access-token");
        assertThat(response.user().id()).isEqualTo(user.getId());
    }

    @Test
    void googleSignInCreatesVerifiedAccountSendsWelcomeAndSignInCode() {
        when(googleVerifier.verify("id-token")).thenReturn(
                new GoogleTokenVerifier.GoogleProfile("ada@example.com", "Ada", "Lovelace"));
        when(userRepository.findByEmail("ada@example.com")).thenReturn(Optional.empty());

        PendingVerificationResponse response = authService.googleSignIn("id-token");

        ArgumentCaptor<User> saved = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(saved.capture());
        assertThat(saved.getValue().isEmailVerified()).isTrue();
        verify(emailSender).sendWelcome("ada@example.com", "Ada");
        verify(emailSender).sendSignInCode(eq("ada@example.com"), eq("Ada"), anyString());
        verify(emailSender, never()).sendVerificationCode(anyString(), anyString(), anyString());
        assertThat(response.email()).isEqualTo("ada@example.com");
    }

    @Test
    void googleSignInForExistingAccountSendsNoWelcomeEmail() {
        User user = new User("Ada", "Lovelace", "ada@example.com", passwordEncoder.encode("secret123"));
        user.markEmailVerified();
        when(googleVerifier.verify("id-token")).thenReturn(
                new GoogleTokenVerifier.GoogleProfile("ada@example.com", "Ada", "Lovelace"));
        when(userRepository.findByEmail("ada@example.com")).thenReturn(Optional.of(user));

        authService.googleSignIn("id-token");

        verify(emailSender, never()).sendWelcome(anyString(), anyString());
        verify(emailSender).sendSignInCode(eq("ada@example.com"), eq("Ada"), anyString());
    }

    @Test
    void googleSignInCodeGivesTokensOnlyWhenCorrect() {
        User user = new User("Ada", "Lovelace", "ada@example.com", passwordEncoder.encode("secret123"));
        user.markEmailVerified();
        EmailVerificationCode stored = new EmailVerificationCode(
                user.getId(), passwordEncoder.encode("654321"), Instant.now().plus(15, ChronoUnit.MINUTES));
        when(userRepository.findByEmail("ada@example.com")).thenReturn(Optional.of(user));
        when(codeRepository.findFirstByUserIdOrderByCreatedAtDesc(user.getId())).thenReturn(Optional.of(stored));
        when(jwtService.generateAccessToken(user.getId())).thenReturn("access-token");
        when(jwtService.generateRefreshToken(user.getId())).thenReturn("refresh-token");
        when(jwtService.getAccessExpirationSeconds()).thenReturn(900L);

        assertThatThrownBy(() -> authService.verifyGoogleCode(new VerifyEmailRequest("ada@example.com", "000000")))
                .isInstanceOf(InvalidRequestException.class);
        assertThat(stored.getAttempts()).isEqualTo(1);

        AuthResponse response = authService.verifyGoogleCode(new VerifyEmailRequest("ada@example.com", "654321"));
        assertThat(response.accessToken()).isEqualTo("access-token");
        verify(codeRepository, times(1)).deleteByUserId(user.getId());
    }
}
