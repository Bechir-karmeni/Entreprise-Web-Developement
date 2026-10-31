package com.dailytracker.nutrition.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/** The language the analysis should be written in: "en" or "de". */
public record AnalysisRequest(
        @NotBlank @Pattern(regexp = "en|de") String language
) {
}
