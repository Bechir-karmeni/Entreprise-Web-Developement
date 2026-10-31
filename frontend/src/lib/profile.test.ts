import { describe, expect, it } from "vitest";
import {
  EMPTY_PROFILE_FORM,
  ageOn,
  bmi,
  bmiCategory,
  buildProfileInput,
  validateProfileForm,
  weeklyPaceKg,
  type ProfileFormValues,
} from "./profile";

const today = new Date(2026, 9, 25); // 25 October 2026

const complete: ProfileFormValues = {
  ...EMPTY_PROFILE_FORM,
  sex: "MALE",
  dateOfBirth: "1996-10-08",
  heightCm: "180",
  weightKg: "80",
  activityLevel: "MODERATELY_ACTIVE",
  goal: "MAINTAIN_WEIGHT",
  medicalConfirmed: true,
};

describe("profile calculations", () => {
  it("counts whole years and respects the birthday", () => {
    expect(ageOn("1996-10-08", today)).toBe(30);
    expect(ageOn("1996-10-26", today)).toBe(29);
  });

  it("calculates BMI and its WHO category", () => {
    expect(bmi(180, 80)).toBe(24.7);
    expect(bmiCategory(24.7)).toBe("normal");
    expect(bmiCategory(17.9)).toBe("under");
    expect(bmiCategory(31)).toBe("obese");
  });

  it("converts a daily calorie gap into kg per week", () => {
    expect(weeklyPaceKg(2500, 2000)).toBe(-0.45);
    expect(weeklyPaceKg(2500, 2500)).toBe(0);
  });
});

describe("profile form validation", () => {
  it("accepts a complete adult form", () => {
    expect(validateProfileForm(complete, today)).toEqual({});
  });

  it("rejects users under 18 and missing medical confirmation", () => {
    const errors = validateProfileForm({ ...complete, dateOfBirth: "2010-01-01", medicalConfirmed: false }, today);
    expect(errors.age).toBe(true);
    expect(errors.medical).toBe(true);
  });

  it("rejects heights and weights outside the backend limits", () => {
    const errors = validateProfileForm({ ...complete, heightCm: "90", weightKg: "400" }, today);
    expect(errors.heightCm).toBe(true);
    expect(errors.weightKg).toBe(true);
  });

  it("converts the form into the request body", () => {
    expect(buildProfileInput(complete)).toEqual({
      sex: "MALE",
      dateOfBirth: "1996-10-08",
      heightCm: 180,
      weightKg: 80,
      activityLevel: "MODERATELY_ACTIVE",
      goal: "MAINTAIN_WEIGHT",
    });
  });
});
