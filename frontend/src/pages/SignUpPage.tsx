import { useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthLayout } from "../components/AuthLayout";
import { FormField, PasswordField } from "../components/FormField";
import { PasswordStrength } from "../components/PasswordStrength";
import { Divider, SocialButtons } from "../components/SocialButtons";
import { ApiError } from "../api/http";
import { useAuth } from "../auth/useAuth";
import {
  ArrowRightIcon,
  BoltIcon,
  CameraIcon,
  ChecklistIcon,
  CheckIcon,
  ClockIcon,
  LockIcon,
  MailIcon,
  ShieldIcon,
  SparkleIcon,
  UtensilsIcon,
} from "../components/icons";
import { validateRegister, validateTerms, type FieldErrors } from "../lib/validation";
import type { RegisterInput } from "../types/auth";

const EMPTY: RegisterInput = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  confirmPassword: "",
};

export default function SignUpPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState<RegisterInput>(EMPTY);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [errors, setErrors] = useState<FieldErrors<RegisterInput>>({});
  const [termsError, setTermsError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function update(field: keyof RegisterInput) {
    return (event: ChangeEvent<HTMLInputElement>) =>
      setValues((current) => ({ ...current, [field]: event.target.value }));
  }

  const passwordsMatch = values.confirmPassword.length > 0 && values.confirmPassword === values.password;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fieldErrors = validateRegister(values);
    const terms = validateTerms(acceptedTerms);
    setErrors(fieldErrors);
    setTermsError(terms);
    setFormError(null);
    if (Object.keys(fieldErrors).length > 0 || terms) return;

    setSubmitting(true);
    try {
      await register(values);
      navigate("/dashboard", { replace: true });
    } catch (error) {
      if (error instanceof ApiError) {
        // Show per-field messages from the backend when present (for example, a taken email).
        if (error.errors) {
          setErrors(error.errors as FieldErrors<RegisterInput>);
        } else if (error.status === 409) {
          setErrors({ email: error.message });
        } else {
          setFormError(error.message);
        }
      } else {
        setFormError("Could not create your account. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout panel={<SignUpPanels />}>
      <div className="w-full max-w-xl rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200/70">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
          <BoltIcon className="h-3.5 w-3.5" /> 14-DAY FREE ACCESS
        </span>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">Create your account</h1>
        <p className="mt-1 text-sm text-slate-600">Start your 14-day personalized nutrition trial. No credit card required.</p>

        <div className="mt-6 space-y-5">
          <SocialButtons verb="Sign up with" />
          <Divider>Or sign up with email</Divider>

          <form noValidate onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="First Name" name="firstName" autoComplete="given-name" placeholder="e.g. Bechir"
                value={values.firstName} error={errors.firstName} onChange={update("firstName")} />
              <FormField label="Last Name" name="lastName" autoComplete="family-name" placeholder="e.g. Amara"
                value={values.lastName} error={errors.lastName} onChange={update("lastName")} />
            </div>

            <FormField label="Email Address" name="email" type="email" autoComplete="email" placeholder="name@example.com"
              icon={<MailIcon className="h-4 w-4" />} value={values.email} error={errors.email} onChange={update("email")} />

            <PasswordField label="Create Password" name="password" autoComplete="new-password" placeholder="Create a password"
              hint={<span className="text-xs text-slate-500">Minimum 8 characters</span>}
              value={values.password} error={errors.password} onChange={update("password")} />
            <PasswordStrength password={values.password} />

            <PasswordField label="Confirm Password" name="confirmPassword" autoComplete="new-password" placeholder="Repeat your password"
              matched={passwordsMatch} value={values.confirmPassword} error={errors.confirmPassword}
              onChange={update("confirmPassword")} />
            {passwordsMatch && !errors.confirmPassword && (
              <p className="-mt-2 text-xs font-medium text-emerald-700">Passwords match ✓</p>
            )}

            <div>
              <label className="flex items-start gap-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-emerald-700"
                />
                <span>
                  I agree to the{" "}
                  <a href="#" className="text-emerald-800 underline">Terms of Service</a> and{" "}
                  <a href="#" className="text-emerald-800 underline">Privacy Policy</a>, including dietary &amp; allergen
                  processing consent.
                </span>
              </label>
              {termsError && <p className="mt-1.5 text-sm text-red-600">{termsError}</p>}
            </div>

            {formError && (
              <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {formError}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#00613f] text-sm font-semibold text-white shadow-sm hover:bg-[#004f33] disabled:opacity-60"
            >
              {submitting ? "Creating account..." : "Create Account & Start Onboarding"}
              {!submitting && <ArrowRightIcon className="h-4 w-4" />}
            </button>
          </form>

          <p className="text-center text-sm text-slate-600">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-emerald-800 underline underline-offset-2">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}

function SignUpPanels() {
  const features = [
    { icon: SparkleIcon, title: "AI-Powered Meal Plan Wizard", text: "Instant 7-day personalized plans tailored to your basal metabolic rate." },
    { icon: CameraIcon, title: "Real-Time Plate & Barcode Scanner", text: "Point and log meals in seconds with sub-gram nutritional precision." },
    { icon: ChecklistIcon, title: "Automated Grocery Checklist", text: "Synchronized seamlessly with current pantry supplies and target budget." },
    { icon: ShieldIcon, title: "Smart Allergen & Restriction Filtering", text: "Instant cross-checks against 28+ clinical allergen sensitivities." },
  ];

  return (
    <>
      <div className="rounded-2xl bg-white p-7 shadow-sm ring-1 ring-slate-200/70">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">Instant Access</span>
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">Tier 1 Pro Included</span>
        </div>
        <h2 className="mt-3 text-xl font-semibold">What you unlock today:</h2>
        <p className="mt-1 text-sm text-slate-600">
          Get immediate metabolic clarity with clinically verified tools designed for active lifestyles.
        </p>

        <ul className="mt-5 space-y-4">
          {features.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
                <Icon className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold">{title}</p>
                <p className="text-sm text-slate-600">{text}</p>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-6 rounded-xl bg-[#f2f4fb] p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Sample metabolic target</span>
            <span className="text-sm font-bold text-emerald-800">2,150 kcal</span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-white py-2">
              <p className="text-base font-bold text-emerald-800">160g</p>
              <p className="text-[11px] text-slate-500">Protein</p>
            </div>
            <div className="rounded-lg bg-white py-2">
              <p className="text-base font-bold text-amber-600">210g</p>
              <p className="text-[11px] text-slate-500">Carbs</p>
            </div>
            <div className="rounded-lg bg-white py-2">
              <p className="text-base font-bold text-amber-500">65g</p>
              <p className="text-[11px] text-slate-500">Fats</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-gradient-to-b from-[#00704a] to-[#004d35] p-7 text-white shadow-lg">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /> Next Step Preview
        </span>
        <h3 className="mt-4 text-xl font-semibold leading-snug">
          Step 1 of your journey: Setup your biological targets in under 2 minutes.
        </h3>
        <p className="mt-2 text-sm text-emerald-100/80">
          Tailored intake formulas adapt your daily caloric splits based on real-time activity and sleep feedback.
        </p>
        <div className="mt-5 flex items-center gap-3 text-xs text-emerald-100">
          <ClockIcon className="h-4 w-4" />
          <span>Estimated setup: 90 seconds</span>
          <span className="ml-auto h-1.5 w-16 rounded-full bg-white/20">
            <span className="block h-full w-1/3 rounded-full bg-emerald-300" />
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
          <UtensilsIcon className="h-5 w-5" />
        </span>
        <div className="flex-1">
          <p className="text-sm font-semibold">Over 500,000+ healthy meals</p>
          <p className="text-sm text-slate-600">logged this month by verified community members</p>
        </div>
        <CheckIcon className="h-5 w-5 text-emerald-700" />
      </div>
    </>
  );
}
