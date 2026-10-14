import { describe, expect, it } from "vitest";
import {
  getPasswordStrength,
  validateEmail,
  validateLogin,
  validatePassword,
  validateRegister,
  validateTerms,
} from "./validation";

const validRegister = {
  firstName: "Ada",
  lastName: "Lovelace",
  email: "ada@example.com",
  password: "secret123",
  confirmPassword: "secret123",
};

describe("validatePassword", () => {
  it("accepts a password with a letter and a digit", () => {
    expect(validatePassword("secret123")).toBeNull();
  });

  it("rejects passwords shorter than 8 characters", () => {
    expect(validatePassword("abc12")).not.toBeNull();
  });

  it("rejects passwords without a digit", () => {
    expect(validatePassword("onlyletters")).toBe("Use at least one letter and one digit.");
  });

  it("rejects passwords without a letter", () => {
    expect(validatePassword("12345678")).toBe("Use at least one letter and one digit.");
  });
});

describe("validateEmail", () => {
  it("accepts a normal address", () => {
    expect(validateEmail("ada@example.com")).toBeNull();
  });

  it("rejects an address without a domain", () => {
    expect(validateEmail("ada@example")).toBe("Enter a valid email address.");
  });
});

describe("validateRegister", () => {
  it("returns no errors for valid input", () => {
    expect(validateRegister(validRegister)).toEqual({});
  });

  it("reports mismatched passwords on the confirmation field", () => {
    const errors = validateRegister({ ...validRegister, confirmPassword: "different1" });
    expect(errors.confirmPassword).toBe("Passwords do not match.");
  });

  it("reports missing names", () => {
    const errors = validateRegister({ ...validRegister, firstName: "  ", lastName: "" });
    expect(errors.firstName).toBe("First name is required.");
    expect(errors.lastName).toBe("Last name is required.");
  });
});

describe("validateLogin", () => {
  it("requires an email and a password", () => {
    const errors = validateLogin({ email: "", password: "" });
    expect(errors.email).toBe("Email is required.");
    expect(errors.password).toBe("Password is required.");
  });
});

describe("validateTerms", () => {
  it("requires the terms to be accepted", () => {
    expect(validateTerms(false)).not.toBeNull();
    expect(validateTerms(true)).toBeNull();
  });
});

describe("getPasswordStrength", () => {
  it("scores all four checks for a password with letters, digits and a symbol", () => {
    expect(getPasswordStrength("NutriMetric#2025")).toEqual({
      score: 4,
      label: "Strong password (8+ chars, numbers & symbols)",
    });
  });

  it("scores 3 of 4 when there is no symbol", () => {
    expect(getPasswordStrength("secret123").score).toBe(3);
  });

  it("scores low for a short password", () => {
    expect(getPasswordStrength("abc").score).toBe(1);
  });
});
