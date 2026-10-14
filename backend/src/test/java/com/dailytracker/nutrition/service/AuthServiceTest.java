package com.dailytracker.nutrition.service;

import com.dailytracker.nutrition.dto.AuthResponse;
import com.dailytracker.nutrition.dto.LoginRequest;
import com.dailytracker.nutrition.dto.RegisterRequest;
import com.dailytracker.nutrition.entity.User;
import com.dailytracker.nutrition.exception.EmailAlreadyRegisteredException;
import com.dailytracker.nutrition.exception.InvalidRequestException;
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

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private AuthenticationManager authenticationManager;

    @Mock
    private JwtService jwtService;

    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder(4);

    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(userRepository, passwordEncoder, authenticationManager, jwtService);
    }

    @Test
    void registerNormalizesEmailHashesPasswordAndReturnsTokens() {
        when(userRepository.existsByEmail("ada@example.com")).thenReturn(false);
        when(jwtService.generateAccessToken(any(UUID.class))).thenReturn("access-token");
        when(jwtService.generateRefreshToken(any(UUID.class))).thenReturn("refresh-token");
        when(jwtService.getAccessExpirationSeconds()).thenReturn(900L);

        AuthResponse response = authService.register(
                new RegisterRequest("Ada", "Lovelace", "  Ada@Example.com ", "secret123", "secret123"));

        ArgumentCaptor<User> saved = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(saved.capture());
        assertThat(saved.getValue().getEmail()).isEqualTo("ada@example.com");
        assertThat(saved.getValue().getPasswordHash()).isNotEqualTo("secret123");
        assertThat(passwordEncoder.matches("secret123", saved.getValue().getPasswordHash())).isTrue();
        assertThat(response.accessToken()).isEqualTo("access-token");
        assertThat(response.refreshToken()).isEqualTo("refresh-token");
        assertThat(response.tokenType()).isEqualTo("Bearer");
        assertThat(response.user().email()).isEqualTo("ada@example.com");
    }

    @Test
    void registerRejectsDuplicateEmail() {
        when(userRepository.existsByEmail("ada@example.com")).thenReturn(true);

        assertThatThrownBy(() -> authService.register(
                new RegisterRequest("Ada", "Lovelace", "ada@example.com", "secret123", "secret123")))
                .isInstanceOf(EmailAlreadyRegisteredException.class);

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void registerRejectsMismatchedPasswords() {
        assertThatThrownBy(() -> authService.register(
                new RegisterRequest("Ada", "Lovelace", "ada@example.com", "secret123", "different1")))
                .isInstanceOf(InvalidRequestException.class);

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void loginWithWrongPasswordIsRejected() {
        when(authenticationManager.authenticate(any()))
                .thenThrow(new BadCredentialsException("Bad credentials"));

        assertThatThrownBy(() -> authService.login(new LoginRequest("ada@example.com", "wrong-pass1")))
                .isInstanceOf(BadCredentialsException.class);
    }

    @Test
    void loginWithCorrectPasswordReturnsTokens() {
        User user = new User("Ada", "Lovelace", "ada@example.com", passwordEncoder.encode("secret123"));
        when(userRepository.findByEmail("ada@example.com")).thenReturn(Optional.of(user));
        when(jwtService.generateAccessToken(user.getId())).thenReturn("access-token");
        when(jwtService.generateRefreshToken(user.getId())).thenReturn("refresh-token");
        when(jwtService.getAccessExpirationSeconds()).thenReturn(900L);

        AuthResponse response = authService.login(new LoginRequest("ADA@example.com", "secret123"));

        assertThat(response.accessToken()).isEqualTo("access-token");
        assertThat(response.user().id()).isEqualTo(user.getId());
    }
}
