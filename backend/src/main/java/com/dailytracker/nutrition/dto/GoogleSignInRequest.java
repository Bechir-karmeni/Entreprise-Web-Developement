package com.dailytracker.nutrition.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** The ID token that Google gives the browser after the user picks an account. */
public record GoogleSignInRequest(@NotBlank @Size(max = 4096) String idToken) {
}
