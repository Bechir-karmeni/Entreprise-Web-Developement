package com.dailytracker.nutrition.service;

import com.dailytracker.nutrition.dto.DailyTotalResponse;
import com.dailytracker.nutrition.dto.DayLogResponse;
import com.dailytracker.nutrition.dto.FoodLogEntryResponse;
import com.dailytracker.nutrition.dto.FoodLogRequest;
import com.dailytracker.nutrition.dto.NutrientTotals;
import com.dailytracker.nutrition.dto.QuickEntryRequest;
import com.dailytracker.nutrition.entity.Food;
import com.dailytracker.nutrition.entity.FoodLogEntry;
import com.dailytracker.nutrition.exception.InvalidRequestException;
import com.dailytracker.nutrition.exception.ResourceNotFoundException;
import com.dailytracker.nutrition.food.MicronutrientJson;
import com.dailytracker.nutrition.repository.FoodLogRepository;
import com.dailytracker.nutrition.repository.FoodRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class FoodLogService {

    private final FoodLogRepository entries;
    private final FoodRepository foods;
    /** The longest range the progress page may ask for: one year. */
    static final int MAX_RANGE_DAYS = 366;

    private final Clock clock;

    public FoodLogService(FoodLogRepository entries, FoodRepository foods, Clock clock) {
        this.entries = entries;
        this.foods = foods;
        this.clock = clock;
    }

    /** Adds a food to the log. The nutrient values are scaled from the food's serving size and stored with the entry. */
    @Transactional
    public FoodLogEntryResponse add(UUID userId, FoodLogRequest request) {
        Food food = foods.findById(request.foodId())
                .orElseThrow(() -> new ResourceNotFoundException("Food not found."));
        if (!food.isVisibleTo(userId)) {
            throw new ResourceNotFoundException("Food not found.");
        }
        double factor = factor(request.amount(), food.getServingSize());
        FoodLogEntry entry = new FoodLogEntry(
                userId,
                request.date(),
                request.mealType(),
                food.getId(),
                food.getName(),
                request.amount(),
                food.getServingUnit(),
                (int) Math.round(food.getCalories() * factor),
                round1(food.getProtein() * factor),
                round1(food.getCarbs() * factor),
                round1(food.getFat() * factor),
                round1(food.getFiber() * factor),
                MicronutrientJson.scale(food.getMicronutrients(), factor));
        return FoodLogEntryResponse.from(entries.save(entry));
    }

    /** Adds calories and macros typed in by the user, without a database food. Stored as one portion. */
    @Transactional
    public FoodLogEntryResponse addQuick(UUID userId, QuickEntryRequest request) {
        FoodLogEntry entry = new FoodLogEntry(
                userId,
                request.date(),
                request.mealType(),
                null,
                quickName(request.name()),
                1,
                "portion",
                request.calories(),
                round1(request.proteinGrams()),
                round1(request.carbsGrams()),
                round1(request.fatGrams()),
                round1(request.fiberGrams()));
        return FoodLogEntryResponse.from(entries.save(entry));
    }

    /** Returns one day's entries and their totals. Without a date, returns today (server clock). */
    @Transactional(readOnly = true)
    public DayLogResponse day(UUID userId, LocalDate requestedDate) {
        LocalDate date = requestedDate != null ? requestedDate : LocalDate.now(clock);
        List<FoodLogEntry> list = entries.findByUserIdAndLogDateOrderByCreatedAtAsc(userId, date);
        return new DayLogResponse(
                date,
                totalsOf(list),
                list.stream().map(FoodLogEntryResponse::from).toList());
    }

    /** Changes how much of an entry was eaten. The nutrient values are scaled to the new amount. */
    @Transactional
    public FoodLogEntryResponse updateAmount(UUID userId, UUID id, double amount) {
        FoodLogEntry entry = entries.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Food log entry not found."));
        entry.rescale(amount);
        return FoodLogEntryResponse.from(entries.save(entry));
    }

    @Transactional
    public void delete(UUID userId, UUID id) {
        FoodLogEntry entry = entries.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Food log entry not found."));
        entries.delete(entry);
    }

    /**
     * Nutrient totals for each day in the range that has food logged, oldest first. Days without entries
     * are left out, so the caller treats a missing day as not logged.
     */
    @Transactional(readOnly = true)
    public List<DailyTotalResponse> dailyTotals(UUID userId, LocalDate from, LocalDate to) {
        if (from == null || to == null || to.isBefore(from)) {
            throw new InvalidRequestException("The end date must be on or after the start date.");
        }
        if (ChronoUnit.DAYS.between(from, to) > MAX_RANGE_DAYS) {
            throw new InvalidRequestException("The range can be at most one year.");
        }
        Map<LocalDate, List<FoodLogEntry>> byDay = entries
                .findByUserIdAndLogDateBetweenOrderByLogDateAsc(userId, from, to).stream()
                .collect(Collectors.groupingBy(FoodLogEntry::getLogDate, TreeMap::new, Collectors.toList()));
        return byDay.entrySet().stream()
                .map(day -> new DailyTotalResponse(day.getKey(), totalsOf(day.getValue())))
                .toList();
    }

    /** How much of the serving the user ate, for example 150 g of a 100 g serving is 1.5. */
    static double factor(double amount, double servingSize) {
        return amount / servingSize;
    }

    /** The name shown in the log: trimmed, or a default when the user left it empty. */
    static String quickName(String raw) {
        if (raw == null || raw.isBlank()) {
            return "Quick entry";
        }
        return raw.trim();
    }

    static NutrientTotals totalsOf(List<FoodLogEntry> list) {
        int calories = 0;
        double protein = 0;
        double carbs = 0;
        double fat = 0;
        double fiber = 0;
        for (FoodLogEntry entry : list) {
            calories += entry.getCalories();
            protein += entry.getProtein();
            carbs += entry.getCarbs();
            fat += entry.getFat();
            fiber += entry.getFiber();
        }
        return new NutrientTotals(calories, round1(protein), round1(carbs), round1(fat), round1(fiber));
    }

    static double round1(double value) {
        return Math.round(value * 10.0) / 10.0;
    }
}
