import { useState, type FormEvent, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AuthLayout } from "../components/AuthLayout";
import { FormField, PasswordField } from "../components/FormField";
import { Divider, SocialButtons } from "../components/SocialButtons";
import { ApiError } from "../api/http";
import { useAuth } from "../auth/useAuth";
import { BoltIcon, LockIcon, MailIcon, SparkleIcon } from "../components/icons";
import { validateLogin, type FieldErrors } from "../lib/validation";
import type { LoginInput } from "../types/auth";

const EMPTY: LoginInput = { email: "", password: "" };

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [values, setValues] = useState<LoginInput>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors<LoginInput>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const from = (location.state as { from?: string } | null)?.from ?? "/dashboard";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fieldErrors = validateLogin(values);
    setErrors(fieldErrors);
    setFormError(null);
    if (Object.keys(fieldErrors).length > 0) return;

    setSubmitting(true);
    try {
      await login(values);
      navigate(from, { replace: true });
    } catch (error) {
      // 403 means the password was right but the email is not confirmed yet: send the user to the code screen.
      if (error instanceof ApiError && error.status === 403) {
        navigate(`/verify-email?email=${encodeURIComponent(values.email.trim())}`, { replace: true });
        return;
      }
      setFormError(error instanceof ApiError ? error.message : "Could not sign in. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout panel={<LoginPanel />}>
      <div className="w-full max-w-md rounded-2xl bg-gradient-to-br from-[#e6f7ef] via-white to-white p-8 shadow-sm ring-1 ring-slate-200/70">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
          <LockIcon className="h-3.5 w-3.5" /> Secure Biometric Gateway
        </span>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">Welcome back</h1>
        <p className="mt-1 text-sm text-slate-600">Log in to view today's nutrition targets and meal plans.</p>

        <div className="mt-6 space-y-5">
          <SocialButtons verb="" />
          <Divider>Or continue with email</Divider>

          <form noValidate onSubmit={handleSubmit} className="space-y-5">
            <FormField
              label="Email Address"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="name@example.com"
              icon={<MailIcon className="h-4 w-4" />}
              value={values.email}
              error={errors.email}
              onChange={(e) => setValues({ ...values, email: e.target.value })}
            />
            <PasswordField
              label="Password"
              name="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              hint={
                <Link to="/forgot-password" className="text-xs font-semibold text-emerald-700 hover:underline">
                  Forgot password?
                </Link>
              }
              value={values.password}
              error={errors.password}
              onChange={(e) => setValues({ ...values, password: e.target.value })}
            />

            <label className="flex items-center gap-2.5 text-sm text-slate-700">
              <input type="checkbox" name="remember" className="h-4 w-4 rounded border-slate-300 accent-emerald-700" />
              Remember this device for 30 days
            </label>

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
              {submitting ? "Logging in..." : "Log In"} {!submitting && <span aria-hidden="true">→</span>}
            </button>
          </form>

          <p className="text-center text-sm text-slate-600">
            Don't have an account?{" "}
            <Link to="/signup" className="font-semibold text-emerald-800 underline underline-offset-2">
              Sign up for free
            </Link>
          </p>
          <p className="flex items-center justify-center gap-1.5 text-center text-xs text-slate-500">
            <LockIcon className="h-3 w-3" /> 256-bit HIPAA &amp; GDPR Compliant Data Encryption
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}

function Ring({ percent, color, children }: { percent: number; color: string; children?: ReactNode }) {
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="relative h-14 w-14 shrink-0">
      <svg viewBox="0 0 48 48" className="h-14 w-14 -rotate-90" aria-hidden="true">
        <circle cx="24" cy="24" r={radius} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="4" />
        <circle
          cx="24"
          cy="24"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - percent)}
        />
      </svg>
      {children && <div className="absolute inset-0 flex items-center justify-center">{children}</div>}
    </div>
  );
}

function LoginPanel() {
  return (
    <div className="rounded-2xl bg-gradient-to-b from-[#00704a] to-[#004d35] p-8 text-white shadow-lg">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
        <BoltIcon className="h-3.5 w-3.5" /> Metabolic Precision 3.0
      </span>
      <h2 className="mt-5 text-3xl font-bold leading-tight tracking-tight">
        Personalized Nutrition.
        <br />
        Simplified.
      </h2>
      <p className="mt-3 text-sm text-emerald-100">
        Daily precision logs sync directly with your biometric markers and smart wearables.
      </p>

      <div className="mt-7 rounded-xl bg-white/10 p-5">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-medium">
            <SparkleIcon className="h-4 w-4" /> Today's Target Profile
          </span>
          <span className="rounded-full bg-emerald-300/25 px-2.5 py-0.5 text-xs font-semibold text-emerald-100">
            82% Achieved
          </span>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <Ring percent={0.82} color="#6ee7b7" />
            <div>
              <p className="text-xs text-emerald-100">Calories</p>
              <p className="text-2xl font-bold">
                2,500 <span className="text-sm font-medium">kcal</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Ring percent={0.8} color="#fbbf24" />
            <div>
              <p className="text-xs text-emerald-100">Protein</p>
              <p className="text-2xl font-bold">
                160 <span className="text-sm font-medium">g</span>
              </p>
            </div>
          </div>
        </div>
      </div>


      <div className="mt-6 flex items-center gap-3">
        <div className="flex -space-x-2">
          {["AR", "JM", "SK", "LT"].map((initials, index) => (
            <span
              key={initials}
              className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#00704a] text-[10px] font-bold text-white ${
                ["bg-teal-500", "bg-emerald-400", "bg-lime-600", "bg-green-700"][index]
              }`}
            >
              {initials}
            </span>
          ))}
        </div>
        <div className="text-sm">
          <p className="font-semibold">+12k daily active trackers</p>
          <p className="text-xs text-emerald-100">Consistent metabolic wellness</p>
        </div>
      </div>
    </div>
  );
}
