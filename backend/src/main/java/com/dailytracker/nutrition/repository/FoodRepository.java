package com.dailytracker.nutrition.repository;

import com.dailytracker.nutrition.entity.Food;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface FoodRepository extends JpaRepository<Food, UUID> {

    /** Shared foods (not owned by a user) whose name contains the text, ignoring case. */
    @Query("select f from Food f where f.ownerUserId is null and lower(f.name) like lower(concat('%', :text, '%'))")
    Page<Food> findCommon(@Param("text") String text, Pageable pageable);

    /** One user's own custom foods whose name contains the text, ignoring case. */
    @Query("select f from Food f where f.ownerUserId = :userId and lower(f.name) like lower(concat('%', :text, '%'))")
    Page<Food> findCustom(@Param("userId") UUID userId, @Param("text") String text, Pageable pageable);

    /** Finds a food already imported from an online source, so it is updated rather than duplicated. */
    Optional<Food> findBySourceAndExternalId(String source, String externalId);
}
