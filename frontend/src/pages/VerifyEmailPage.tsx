import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AuthLayout } from "../components/AuthLayout";
import { MailIcon } from "../components/icons";
import { authApi } from "../api/authApi";
import { ApiError } from "../api/http";
import { useAuth } from "../auth/useAuth";

const RESEND_SECONDS = 60;

/**
 * Asks for the 6-digit code that was emailed. Used after sign-up (confirms the email)
 * and after a Google sign-in (?mode=google, a sign-in code).
 */
export default function VerifyEmailPage() {
  const { verifyEmail, verifyGoogleCode } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const email = params.get("email") ?? "";
  const isGoogle = params.get("mode") === "google";

  // The confirm link in the email carries the code, so it is filled in and submitted automatically.
  const [code, setCode] = useState(() => (params.get("code") ?? "").replace(/\D/g, "").slice(0, 6));
  const autoSubmitted = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // The code was sent during sign-up, so the first resend waits one minute.
  const [cooldown, setCooldown] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((seconds) => seconds - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  useEffect(() => {
    if (autoSubmitted.current) return;
    if (email && /^\d{6}$/.test(code)) {
      autoSubmitted.current = true;
      void confirm(code);
    }
    // Runs once, when the page opens from the email link.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, code]);

  async function confirm(value: string) {
    setError(null);
    setNotice(null);
    if (!/^\d{6}$/.test(value)) {
      setError("Enter the 6-digit code from your email.");
      return;
    }
    setSubmitting(true);
    try {
      if (isGoogle) {
        await verifyGoogleCode({ email, code: value });
      } else {
        await verifyEmail({ email, code: value });
      }
      navigate("/dashboard", { replace: true });
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not confirm the code. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await confirm(code);
  }

  async function handleResend() {
    setError(null);
    setNotice(null);
    try {
      if (isGoogle) {
        await authApi.googleResend(email);
      } else {
        await authApi.resendCode(email);
      }
      setNotice("A new code was sent to your email.");
      setCooldown(RESEND_SECONDS);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not send a new code. Please try again.");
    }
  }

  return (
    <AuthLayout panel={<VerifyPanel />}>
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200/70">
        <h1 className="text-3xl font-bold tracking-tight">{isGoogle ? "Confirm your sign-in" : "Confirm your email"}</h1>
        {email ? (
          <p className="mt-1 text-sm text-slate-600">
            Enter the 6-digit code we sent to <span className="font-semibold text-slate-800">{email}</span>.
          </p>
        ) : (
          <p className="mt-1 text-sm text-red-700">
            No email address was given. <Link to="/signup" className="underline">Sign up again</Link>.
          </p>
        )}

        <form noValidate onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block text-sm font-medium">
            Confirmation code
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
            {submitting ? "Confirming..." : "Confirm email"}
          </button>
        </form>

        <div className="mt-4 flex items-center justify-between gap-3 text-sm">
          <button
            type="button"
            onClick={handleResend}
            disabled={cooldown > 0 || !email}
            className="font-medium text-emerald-800 underline disabled:text-slate-400 disabled:no-underline"
          >
            {cooldown > 0 ? `Send a new code in ${cooldown}s` : "Send a new code"}
          </button>
          <Link to="/signup" className="text-slate-500 underline">
            Use a different email
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}

function VerifyPanel() {
  return (
    <div className="rounded-2xl bg-[#00613f] p-8 text-white shadow-sm">
      <MailIcon className="h-8 w-8" />
      <h2 className="mt-4 text-2xl font-bold">Check your inbox</h2>
      <p className="mt-2 text-sm text-emerald-100">
        The code is valid for 15 minutes. You can request a new one after a minute.
      </p>
    </div>
  );
}
