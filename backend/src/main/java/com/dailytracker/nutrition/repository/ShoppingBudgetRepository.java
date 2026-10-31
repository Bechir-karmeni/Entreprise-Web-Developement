package com.dailytracker.nutrition.repository;

import com.dailytracker.nutrition.entity.ShoppingBudget;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface ShoppingBudgetRepository extends JpaRepository<ShoppingBudget, UUID> {
}
