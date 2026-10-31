package com.dailytracker.nutrition.ai;

import com.dailytracker.nutrition.dto.ProfileResponse;
import com.dailytracker.nutrition.dto.TargetsResponse;
import com.dailytracker.nutrition.dto.WeightEntryResponse;

import java.time.LocalDate;
import java.time.Period;
import java.util.List;
import java.util.Locale;

/**
 * Builds the prompt for Claude from the user's logged data. Pure code, so it can be tested without calling the API.
 */
public final class AnalysisPromptBuilder {

    private AnalysisPromptBuilder() {
    }

    /** One day with logged food or water. Calories and macros are the sums of that day's entries. */
    public record DayRow(LocalDate date, int kcal, double protein, double carbs, double fat, double fiber,
                         int waterMl, int entries) {
    }

    public record FoodCount(String name, int times) {
    }

    public record Input(ProfileResponse profile, TargetsResponse targets, LocalDate today, int periodDays,
                        List<DayRow> days, List<WeightEntryResponse> weights, List<FoodCount> topFoods) {
    }

    static final String SYSTEM_PROMPT = """
            You are a careful nutrition coach inside the NutriDay app. The user's logged data for the last 30 days is in the message.

            Write a short, practical analysis as plain text. Do not use markdown symbols, bullet characters, or tables. Use short paragraphs and a line starting with a label for each part:
            1. What the data shows: intake compared with the targets, consistency across the logged days, protein, fiber, water, and the weight trend if there is one.
            2. Recommendations: three to five concrete actions the user can take this week, based on the data.
            3. Limits: the values are estimates, and the analysis covers only the days that were logged.

            Rules:
            - Use only the numbers in the message. Say clearly when there is too little data for a conclusion.
            - You are not a doctor. Do not diagnose anything, and do not recommend medication or supplements.
            - If the data shows very low intake, several days far below the minimum target, or signs of restriction or binge eating, do not suggest eating less or setting a lower target. Recommend talking to a doctor or a registered dietitian instead.
            - Do not invent targets beyond the ones given.
            - Answer in the language named in the message. Keep the whole answer under 350 words.
            """;

    static final String SUMMARY_SYSTEM_PROMPT = """
            You are a friendly nutrition coach inside the NutriDay app. The user's logged data for the last 7 days is in the message.

            Write a short weekly summary as plain text. Do not use markdown symbols, bullet characters, or tables. Use one short paragraph for each of these labels:
            1. Your week: how many days were logged, average calories and protein against the targets, and water.
            2. Highlight: one thing that went well, based on the data.
            3. Next week: one or two small, concrete changes the user can make.

            Rules:
            - Use only the numbers in the message. If there are few logged days, say that the summary is based on little data.
            - You are not a doctor. Do not diagnose anything, and do not recommend medication or supplements.
            - If the data shows very low intake or signs of restriction, do not suggest eating less or setting a lower target. Recommend talking to a doctor or a registered dietitian instead.
            - Answer in the language named in the message. Keep the whole answer under 200 words.
            """;

    static final String MACRO_SYSTEM_PROMPT = """
            You are a practical nutrition coach inside the NutriDay app. The user's logged data for the last 14 days, with daily targets, is in the message.

            Give personal macro guidance as plain text. Do not use markdown symbols, bullet characters, or tables. Use one short paragraph for each of these labels:
            1. Macro picture: how protein, carbohydrates, fat and fiber compare with the targets on the days logged.
            2. Pattern: one pattern you see in the data, such as protein being low at breakfast or fiber on only a few days.
            3. Three tips: three concrete food swaps or habits, each one sentence, that fit the user's data.

            Rules:
            - Use only the numbers in the message. If there are few logged days, say that the guidance is based on little data.
            - Suggest foods and habits, not supplements, and do not recommend a specific diet plan.
            - You are not a doctor. Do not diagnose anything.
            - If the data shows very low intake or signs of restriction, do not suggest eating less. Recommend talking to a doctor or a registered dietitian instead.
            - Answer in the language named in the message. Keep the whole answer under 220 words.
            """;

    public static String macroSystemPrompt() {
        return MACRO_SYSTEM_PROMPT;
    }

    public static String systemPrompt() {
        return SYSTEM_PROMPT;
    }

    public static String summarySystemPrompt() {
        return SUMMARY_SYSTEM_PROMPT;
    }

    public static String userMessage(Input input, String language) {
        StringBuilder text = new StringBuilder();
        text.append("Answer in ").append(languageName(language)).append(".\n\n");
        appendProfile(text, input);
        appendTargets(text, input);
        appendSummary(text, input);
        appendDailyLog(text, input);
        appendWeights(text, input);
        appendFoods(text, input);
        return text.toString();
    }

    private static void appendProfile(StringBuilder text, Input input) {
        ProfileResponse profile = input.profile();
        int age = Period.between(profile.dateOfBirth(), input.today()).getYears();
        text.append("PROFILE\n");
        text.append(String.format(Locale.ROOT, "Sex: %s, age: %d years, height: %.0f cm, weight: %.1f kg%n",
                profile.sex(), age, profile.heightCm(), profile.weightKg()));
        text.append("Activity level: ").append(profile.activityLevel()).append(", goal: ").append(profile.goal()).append("\n\n");
    }

    private static void appendTargets(StringBuilder text, Input input) {
        TargetsResponse targets = input.targets();
        text.append("DAILY TARGETS\n");
        text.append(String.format(Locale.ROOT,
                "Calories: %d kcal, protein: %d g, carbohydrates: %d g, fat: %d g, fiber: %d g, water: %.1f L%n",
                targets.calories(), targets.proteinGrams(), targets.carbsGrams(), targets.fatGrams(),
                targets.fiberGrams(), targets.waterLiters()));
        text.append(String.format(Locale.ROOT, "Basal metabolic rate: %d kcal, total daily burn: %d kcal%n",
                targets.bmr(), targets.tdee()));
        if (targets.minimumCaloriesApplied()) {
            text.append("The calorie target was raised to the safety minimum for this profile.\n");
        }
        text.append("\n");
    }

    private static void appendSummary(StringBuilder text, Input input) {
        List<DayRow> foodDays = input.days().stream().filter(day -> day.entries() > 0).toList();
        List<DayRow> waterDays = input.days().stream().filter(day -> day.waterMl() > 0).toList();
        text.append("SUMMARY\n");
        text.append(String.format(Locale.ROOT, "Period: last %d days. Days with food logged: %d of %d.%n",
                input.periodDays(), foodDays.size(), input.periodDays()));
        if (!foodDays.isEmpty()) {
            text.append(String.format(Locale.ROOT,
                    "Average on days with food logged: %.0f kcal, protein %.0f g, carbohydrates %.0f g, fat %.0f g, fiber %.0f g%n",
                    average(foodDays, day -> day.kcal()), average(foodDays, day -> day.protein()),
                    average(foodDays, day -> day.carbs()), average(foodDays, day -> day.fat()),
                    average(foodDays, day -> day.fiber())));
        }
        if (!waterDays.isEmpty()) {
            text.append(String.format(Locale.ROOT, "Average water on days with water logged: %.0f ml%n",
                    average(waterDays, day -> day.waterMl())));
        }
        text.append("\n");
    }

    private static void appendDailyLog(StringBuilder text, Input input) {
        text.append("DAILY LOG (days with entries only)\n");
        if (input.days().isEmpty()) {
            text.append("No entries in this period.\n");
        }
        for (DayRow day : input.days()) {
            text.append(String.format(Locale.ROOT,
                    "%s: %d kcal, protein %.0f g, carbohydrates %.0f g, fat %.0f g, fiber %.0f g, water %d ml, %d food entries%n",
                    day.date(), day.kcal(), day.protein(), day.carbs(), day.fat(), day.fiber(), day.waterMl(), day.entries()));
        }
        text.append("\n");
    }

    private static void appendWeights(StringBuilder text, Input input) {
        text.append("WEIGHT (kg)\n");
        if (input.weights().isEmpty()) {
            text.append("No weigh-ins in this period.\n");
        }
        for (WeightEntryResponse weight : input.weights()) {
            text.append(String.format(Locale.ROOT, "%s: %.1f%n", weight.date(), weight.weightKg()));
        }
        text.append("\n");
    }

    private static void appendFoods(StringBuilder text, Input input) {
        text.append("MOST LOGGED FOODS\n");
        if (input.topFoods().isEmpty()) {
            text.append("None.\n");
        }
        for (FoodCount food : input.topFoods()) {
            text.append(food.name()).append(" (").append(food.times()).append(" times)\n");
        }
    }

    private static double average(List<DayRow> days, java.util.function.ToDoubleFunction<DayRow> value) {
        return days.stream().mapToDouble(value).average().orElse(0);
    }

    private static String languageName(String language) {
        return "de".equals(language) ? "German" : "English";
    }
}
