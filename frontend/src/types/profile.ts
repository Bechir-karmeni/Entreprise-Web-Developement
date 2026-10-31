export type NutritionGoal =
  | "LOSE_WEIGHT"
  | "MAINTAIN_WEIGHT"
  | "GAIN_WEIGHT"
  | "GAIN_MUSCLE"
  | "GENERAL_HEALTHY_EATING";

export type ActivityLevel = "SEDENTARY" | "LIGHTLY_ACTIVE" | "MODERATELY_ACTIVE" | "VERY_ACTIVE" | "EXTRA_ACTIVE";

export type Sex = "MALE" | "FEMALE";

export interface ProfileResponse {
  sex: Sex;
  dateOfBirth: string;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  goal: NutritionGoal;
}

export interface ProfileInput {
  sex: Sex;
  dateOfBirth: string;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  goal: NutritionGoal;
}
