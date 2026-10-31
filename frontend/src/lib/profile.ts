import type { ActivityLevel, NutritionGoal, ProfileInput, Sex } from "../types/profile";

/** Calories in roughly 1 kg of body fat (common estimate used to convert a daily gap into weekly kg). */
const KCAL_PER_KG = 7700;
export const MIN_AGE = 18;

/** Suggested share of the daily calories per meal. The four shares add up to 100 %. */
export const MEAL_SHARE: Record<"BREAKFAST" | "LUNCH" | "DINNER" | "SNACK", number> = {
  BREAKFAST: 0.25,
  LUNCH: 0.35,
  DINNER: 0.3,
  SNACK: 0.1,
};

export interface ProfileFormValues {
  sex: Sex | "";
  dateOfBirth: string;
  heightCm: string;
  weightKg: string;
  activityLevel: ActivityLevel | "";
  goal: NutritionGoal | "";
  medicalConfirmed: boolean;
}

export const EMPTY_PROFILE_FORM: ProfileFormValues = {
  sex: "",
  dateOfBirth: "",
  heightCm: "",
  weightKg: "",
  activityLevel: "",
  goal: "",
  medicalConfirmed: false,
};

export type ProfileErrorKey =
  | "sex"
  | "dateOfBirth"
  | "age"
  | "heightCm"
  | "weightKg"
  | "activityLevel"
  | "goal"
  | "medical";

/** Whole years between a YYYY-MM-DD birth date and the given day. */
export function ageOn(dateOfBirth: string, today: Date): number {
  const [year, month, day] = dateOfBirth.split("-").map(Number);
  let age = today.getFullYear() - year;
  const monthDiff = today.getMonth() + 1 - month;
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < day)) {
    age -= 1;
  }
  return age;
}

/** Body mass index, rounded to one decimal place. */
export function bmi(heightCm: number, weightKg: number): number {
  const meters = heightCm / 100;
  return Math.round((weightKg / (meters * meters)) * 10) / 10;
}

export type BmiCategory = "under" | "normal" | "over" | "obese";

/** WHO adult categories. */
export function bmiCategory(value: number): BmiCategory {
  if (value < 18.5) return "under";
  if (value < 25) return "normal";
  if (value < 30) return "over";
  return "obese";
}

/** Expected weight change per week in kg. Negative = loss, positive = gain. */
export function weeklyPaceKg(tdee: number, calories: number): number {
  return Math.round(((calories - tdee) * 7 / KCAL_PER_KG) * 100) / 100;
}

/** Returns the error keys for the invalid fields. An empty object means the form can be sent. */
export function validateProfileForm(values: ProfileFormValues, today: Date): Partial<Record<ProfileErrorKey, true>> {
  const errors: Partial<Record<ProfileErrorKey, true>> = {};
  if (!values.sex) errors.sex = true;
  if (!values.dateOfBirth) {
    errors.dateOfBirth = true;
  } else if (ageOn(values.dateOfBirth, today) < MIN_AGE) {
    errors.age = true;
  }
  const height = Number(values.heightCm);
  if (!values.heightCm || Number.isNaN(height) || height < 100 || height > 250) errors.heightCm = true;
  const weight = Number(values.weightKg);
  if (!values.weightKg || Number.isNaN(weight) || weight < 30 || weight > 300) errors.weightKg = true;
  if (!values.activityLevel) errors.activityLevel = true;
  if (!values.goal) errors.goal = true;
  if (!values.medicalConfirmed) errors.medical = true;
  return errors;
}

/** Converts the validated form into the request body of PUT /api/profile. */
export function buildProfileInput(values: ProfileFormValues): ProfileInput {
  return {
    sex: values.sex as Sex,
    dateOfBirth: values.dateOfBirth,
    heightCm: Number(values.heightCm),
    weightKg: Number(values.weightKg),
    activityLevel: values.activityLevel as ActivityLevel,
    goal: values.goal as NutritionGoal,
  };
}
