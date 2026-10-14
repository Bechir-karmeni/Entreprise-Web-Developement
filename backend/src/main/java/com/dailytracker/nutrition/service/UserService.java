package com.dailytracker.nutrition.service;

import com.dailytracker.nutrition.dto.UserSummary;
import com.dailytracker.nutrition.exception.InvalidTokenException;
import com.dailytracker.nutrition.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public UserSummary getUser(UUID userId) {
        return userRepository.findById(userId)
                .map(UserSummary::from)
                .orElseThrow(() -> new InvalidTokenException("Invalid or expired token."));
    }
}
