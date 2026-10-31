package com.dailytracker.nutrition.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

import java.time.LocalDate;

/** The day to write a note about, and the language of the note ("en" or "de"). */
public record TodayCoachRequest(
        @NotNull LocalDate date,
        @NotBlank @Pattern(regexp = "en|de") String language
) {
}
