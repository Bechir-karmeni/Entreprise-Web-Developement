package com.dailytracker.nutrition.dto;

import com.dailytracker.nutrition.entity.User;

import java.util.UUID;

/** Public view of a user. Never includes the password hash. */
public record UserSummary(UUID id, String firstName, String lastName, String email) {

    public static UserSummary from(User user) {
        return new UserSummary(user.getId(), user.getFirstName(), user.getLastName(), user.getEmail());
    }
}
