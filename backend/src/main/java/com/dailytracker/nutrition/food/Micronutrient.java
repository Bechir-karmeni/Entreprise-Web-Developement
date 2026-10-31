package com.dailytracker.nutrition.food;

/**
 * The vitamins, minerals and a few other nutrients we track per food.
 *
 * <p>usdaId is the USDA FoodData Central nutrient number. referenceAmount is the reference value for adults
 * in the same unit as the USDA value, so no conversion is needed; null means there is no reference value and
 * only the amount is shown. Vitamins and minerals use the EU daily reference values (Regulation (EU) No
 * 1169/2011, Annex XIII). SALT is computed from sodium at import and compared with the WHO limit of 5 g a day.
 * The order of the constants is the order shown on the Today page.
 */
public enum Micronutrient {
    VITAMIN_A(1106, "µg", 800),
    VITAMIN_D(1114, "µg", 5),
    VITAMIN_E(1109, "mg", 12),
    VITAMIN_K(1185, "µg", 75),
    VITAMIN_C(1162, "mg", 80),
    THIAMIN(1165, "mg", 1.1),
    RIBOFLAVIN(1166, "mg", 1.4),
    NIACIN(1167, "mg", 16),
    VITAMIN_B6(1175, "mg", 1.4),
    FOLATE(1177, "µg", 200),
    VITAMIN_B12(1178, "µg", 2.5),
    CALCIUM(1087, "mg", 800),
    IRON(1089, "mg", 14),
    MAGNESIUM(1090, "mg", 375),
    PHOSPHORUS(1091, "mg", 700),
    POTASSIUM(1092, "mg", 2000),
    ZINC(1095, "mg", 10),
    COPPER(1098, "mg", 1),
    MANGANESE(1101, "mg", 2),
    SELENIUM(1103, "µg", 55),
    /** Sugars, total. No reference value: the amount is shown alone. */
    SUGAR(2000, "g"),
    /** Saturated fat. No reference value: the amount is shown alone. */
    SATURATED_FAT(1258, "g"),
    /** Salt, computed from the sodium value at import. Compared with the WHO limit of 5 g per day. */
    SALT(1093, "g", 5);

    private final int usdaId;
    private final String unit;
    private final Double referenceAmount;

    Micronutrient(int usdaId, String unit, double referenceAmount) {
        this.usdaId = usdaId;
        this.unit = unit;
        this.referenceAmount = referenceAmount;
    }

    Micronutrient(int usdaId, String unit) {
        this.usdaId = usdaId;
        this.unit = unit;
        this.referenceAmount = null;
    }

    public int usdaId() {
        return usdaId;
    }

    public String unit() {
        return unit;
    }

    /** The reference value for adults, or null when there is none. */
    public Double referenceAmount() {
        return referenceAmount;
    }
}
