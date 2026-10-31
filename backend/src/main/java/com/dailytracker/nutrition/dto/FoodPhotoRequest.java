package com.dailytracker.nutrition.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/**
 * A meal photo to analyse. The image is base64 data (without the "data:" prefix), at most about 4 MB before encoding.
 */
public record FoodPhotoRequest(
        @NotBlank String imageBase64,
        @NotBlank @Pattern(regexp = "image/(jpeg|png|webp)") String mimeType,
        @NotBlank @Pattern(regexp = "en|de") String language
) {
}
