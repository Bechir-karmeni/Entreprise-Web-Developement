import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthLayout } from "../components/AuthLayout";
import { FormField } from "../components/FormField";
import { MailIcon } from "../components/icons";
import { authApi } from "../api/authApi";
import { ApiError } from "../api/http";

/** Step 1 of resetting a password: the user gives the email, and a 6-digit code is sent to it. */
export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Enter a valid email address.");
      return;
    }
    setSubmitting(true);
    try {
      await authApi.requestPasswordReset(trimmed);
      navigate(`/reset-password?email=${encodeURIComponent(trimmed)}`);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not send the code. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout panel={<ForgotPanel />}>
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200/70">
        <h1 className="text-3xl font-bold tracking-tight">Forgot password?</h1>
        <p className="mt-1 text-sm text-slate-600">
          Enter your email. We will send you a 6-digit code to set a new password.
        </p>

        <form noValidate onSubmit={handleSubmit} className="mt-6 space-y-5">
          <FormField
            label="Email Address"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="name@example.com"
            icon={<MailIcon className="h-4 w-4" />}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />

          {error && (
            <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="flex h-12 w-full items-center justify-center rounded-lg bg-[#00613f] text-sm font-semibold text-white shadow-sm hover:bg-[#004f33] disabled:opacity-60"
          >
            {submitting ? "Sending..." : "Send code"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm">
          <Link to="/login" className="font-semibold text-emerald-800 underline underline-offset-2">
            Back to log in
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}

function ForgotPanel() {
  return (
    <div className="rounded-2xl bg-[#00613f] p-8 text-white shadow-sm">
      <h2 className="text-2xl font-bold">Get back into your account</h2>
      <p className="mt-2 text-sm text-emerald-100">
        The code is valid for 15 minutes. It is sent to the email address of your account.
      </p>
    </div>
  );
}
