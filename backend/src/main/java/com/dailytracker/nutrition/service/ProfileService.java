package com.dailytracker.nutrition.service;

import com.dailytracker.nutrition.dto.ProfileRequest;
import com.dailytracker.nutrition.dto.ProfileResponse;
import com.dailytracker.nutrition.dto.TargetsResponse;
import com.dailytracker.nutrition.entity.UserProfile;
import com.dailytracker.nutrition.exception.ResourceNotFoundException;
import com.dailytracker.nutrition.nutrition.BodyProfile;
import com.dailytracker.nutrition.nutrition.NutritionTargetCalculator;
import com.dailytracker.nutrition.nutrition.NutritionTargets;
import com.dailytracker.nutrition.repository.UserProfileRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.util.UUID;

@Service
public class ProfileService {

    private final UserProfileRepository profiles;
    private final NutritionTargetCalculator calculator;
    private final Clock clock;

    public ProfileService(UserProfileRepository profiles, NutritionTargetCalculator calculator, Clock clock) {
        this.profiles = profiles;
        this.calculator = calculator;
        this.clock = clock;
    }

    /** Creates the profile on first save and updates it afterwards. */
    @Transactional
    public ProfileResponse save(UUID userId, ProfileRequest request) {
        UserProfile profile = profiles.findById(userId).orElseGet(() -> new UserProfile(userId));
        profile.update(
                request.sex(),
                request.dateOfBirth(),
                request.heightCm(),
                request.weightKg(),
                request.activityLevel(),
                request.goal());
        return ProfileResponse.from(profiles.save(profile));
    }

    @Transactional(readOnly = true)
    public ProfileResponse getProfile(UUID userId) {
        return ProfileResponse.from(findProfile(userId));
    }

    @Transactional(readOnly = true)
    public TargetsResponse getTargets(UUID userId) {
        UserProfile profile = findProfile(userId);
        BodyProfile body = new BodyProfile(
                profile.getSex(),
                profile.getDateOfBirth(),
                profile.getHeightCm(),
                profile.getWeightKg(),
                profile.getActivityLevel(),
                profile.getGoal());
        NutritionTargets targets = calculator.calculate(body, LocalDate.now(clock));
        return TargetsResponse.from(targets);
    }

    private UserProfile findProfile(UUID userId) {
        return profiles.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Create your profile first."));
    }
}
