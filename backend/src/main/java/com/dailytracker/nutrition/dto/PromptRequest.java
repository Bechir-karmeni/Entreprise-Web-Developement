package com.dailytracker.nutrition.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** A short description of the meal the user wants, for example "high protein meal with chicken". */
public record PromptRequest(@NotBlank @Size(min = 3, max = 200) String text) {
}
