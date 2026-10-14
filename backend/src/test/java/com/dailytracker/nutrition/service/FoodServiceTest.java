package com.dailytracker.nutrition.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.dailytracker.nutrition.dto.CustomFoodRequest;
import com.dailytracker.nutrition.dto.FoodResponse;
import com.dailytracker.nutrition.dto.PageResponse;
import com.dailytracker.nutrition.entity.Food;
import com.dailytracker.nutrition.exception.InvalidRequestException;
import com.dailytracker.nutrition.exception.ResourceNotFoundException;
import com.dailytracker.nutrition.food.Allergen;
import com.dailytracker.nutrition.food.FoodCategory;
import com.dailytracker.nutrition.food.FoodScope;
import com.dailytracker.nutrition.repository.FoodRepository;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.PageImpl;

@ExtendWith(MockitoExtension.class)
class FoodServiceTest {

    private static final UUID USER = UUID.randomUUID();
    private static final UUID OTHER_USER = UUID.randomUUID();

    @Mock
    private FoodRepository foods;

    private Food egg() {
        Food food = new Food("Egg, whole, hard-boiled", FoodCategory.PROTEIN, 100, "g", 155, 12.6, 1.1, 10.6, 0);
        food.getAllergens().add(Allergen.EGGS);
        return food;
    }

    private Food customFoodOf(UUID owner) {
        return new Food(owner, "My chicken bowl", null, FoodCategory.OTHER, 350, "g", 520, 40, 60, 12, 6,
                Set.of(Allergen.SESAME));
    }

    @Test
    void searchReturnsSharedFoodsWithAllergens() {
        when(foods.findCommon(eq("egg"), any(Pageable.class)))
                .thenAnswer(invocation -> new PageImpl<>(List.of(egg()), invocation.getArgument(1), 1));

        PageResponse<FoodResponse> result = new FoodService(foods).search(USER, "  egg  ", FoodScope.COMMON, 0, 20);

        assertEquals(1, result.totalElements());
        assertEquals("Egg, whole, hard-boiled", result.content().get(0).name());
        assertEquals(List.of(Allergen.EGGS), result.content().get(0).allergens());
    }

    @Test
    void customSearchOnlyUsesTheCurrentUsersFoods() {
        when(foods.findCustom(eq(USER), eq("bowl"), any(Pageable.class)))
                .thenAnswer(invocation -> new PageImpl<>(List.of(customFoodOf(USER)), invocation.getArgument(2), 1));

        PageResponse<FoodResponse> result = new FoodService(foods).search(USER, "bowl", FoodScope.CUSTOM, 0, 20);

        assertEquals("CUSTOM", result.content().get(0).source());
    }

    @Test
    void pageSizeIsLimitedToFifty() {
        when(foods.findCommon(any(), any(Pageable.class)))
                .thenAnswer(invocation -> new PageImpl<>(List.of(egg()), invocation.getArgument(1), 1));

        PageResponse<FoodResponse> result = new FoodService(foods).search(USER, "", FoodScope.COMMON, 0, 500);

        assertEquals(50, result.size());
    }

    @Test
    void unknownFoodIsNotFound() {
        UUID id = UUID.randomUUID();
        when(foods.findById(id)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> new FoodService(foods).get(USER, id));
    }

    @Test
    void anotherUsersCustomFoodIsNotFound() {
        Food food = customFoodOf(OTHER_USER);
        when(foods.findById(food.getId())).thenReturn(Optional.of(food));

        assertThrows(ResourceNotFoundException.class, () -> new FoodService(foods).get(USER, food.getId()));
    }

    @Test
    void userCannotDeleteAnotherUsersFood() {
        Food food = customFoodOf(OTHER_USER);
        when(foods.findById(food.getId())).thenReturn(Optional.of(food));

        assertThrows(ResourceNotFoundException.class, () -> new FoodService(foods).delete(USER, food.getId()));
        verify(foods, never()).delete(any(Food.class));
    }

    @Test
    void createStoresCustomFoodForTheUser() {
        when(foods.save(any(Food.class))).thenAnswer(invocation -> invocation.getArgument(0));
        CustomFoodRequest request = new CustomFoodRequest("  Quinoa salad  ", " ", 150, "g", 210, 7, 33, 9, 4,
                Set.of(Allergen.TREE_NUTS));

        FoodResponse saved = new FoodService(foods).create(USER, request);

        assertEquals("Quinoa salad", saved.name());
        assertEquals("CUSTOM", saved.source());
        assertEquals(null, saved.brand());
        assertEquals(List.of(Allergen.TREE_NUTS), saved.allergens());
    }

    @Test
    void overlongSearchTextIsRejected() {
        assertThrows(InvalidRequestException.class,
                () -> new FoodService(foods).search(USER, "x".repeat(101), FoodScope.COMMON, 0, 20));
    }
}
