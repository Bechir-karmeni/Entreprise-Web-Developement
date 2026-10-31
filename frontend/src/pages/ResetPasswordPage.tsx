import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AuthLayout } from "../components/AuthLayout";
import { PasswordField } from "../components/FormField";
import { authApi } from "../api/authApi";
import { ApiError } from "../api/http";

/** Step 2 of resetting a password: the emailed code and the new password. */
export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const email = params.get("email") ?? "";

  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    if (!/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit code from your email.");
      return;
    }
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      setError("The password needs at least 8 characters, with one letter and one digit.");
      return;
    }
    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }
    setSubmitting(true);
    try {
      await authApi.resetPassword({ email, code, password, confirmPassword });
      navigate("/login", { replace: true });
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not reset the password. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    setError(null);
    setNotice(null);
    try {
      await authApi.requestPasswordReset(email);
      setNotice("A new code was sent to your email.");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not send a new code. Please try again.");
    }
  }

  return (
    <AuthLayout panel={<ResetPanel />}>
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200/70">
        <h1 className="text-3xl font-bold tracking-tight">Set a new password</h1>
        {email ? (
          <p className="mt-1 text-sm text-slate-600">
            Enter the 6-digit code we sent to <span className="font-semibold text-slate-800">{email}</span>.
          </p>
        ) : (
          <p className="mt-1 text-sm text-red-700">
            No email address was given. <Link to="/forgot-password" className="underline">Start again</Link>.
          </p>
        )}

        <form noValidate onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block text-sm font-medium">
            Reset code
            <input
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
              placeholder="123456"
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-center text-2xl font-semibold tracking-[0.4em] text-slate-900 [color-scheme:light] placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none"
            />
          </label>

          <PasswordField
            label="New password"
            name="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <PasswordField
            label="Confirm new password"
            name="confirmPassword"
            autoComplete="new-password"
            placeholder="Repeat the new password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />

          {error && (
            <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}
          {notice && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}

          <button
            type="submit"
            disabled={submitting || !email}
            className="flex h-12 w-full items-center justify-center rounded-lg bg-[#00613f] text-sm font-semibold text-white shadow-sm hover:bg-[#004f33] disabled:opacity-60"
          >
            {submitting ? "Saving..." : "Change password"}
          </button>
        </form>

        <div className="mt-4 flex items-center justify-between gap-3 text-sm">
          <button
            type="button"
            onClick={handleResend}
            disabled={!email}
            className="font-medium text-emerald-800 underline disabled:text-slate-400 disabled:no-underline"
          >
            Send a new code
          </button>
          <Link to="/login" className="text-slate-500 underline">
            Back to log in
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}

function ResetPanel() {
  return (
    <div className="rounded-2xl bg-[#00613f] p-8 text-white shadow-sm">
      <h2 className="text-2xl font-bold">Almost done</h2>
      <p className="mt-2 text-sm text-emerald-100">
        Enter the code from your email and choose a new password. You can then log in with it.
      </p>
    </div>
  );
}
