import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "../api/authApi";
import { ApiError } from "../api/http";

const GOOGLE_SCRIPT = "https://accounts.google.com/gsi/client";
/** Public OAuth client ID from Google Cloud Console. Set VITE_GOOGLE_CLIENT_ID in frontend/.env. */
const GOOGLE_CLIENT_ID = String(import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "");

interface GoogleCredentialResponse {
  credential: string;
}

interface GoogleIdApi {
  initialize: (config: { client_id: string; callback: (response: GoogleCredentialResponse) => void }) => void;
  renderButton: (parent: HTMLElement, options: { theme?: string; size?: string; text?: string; shape?: string; width?: number }) => void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleIdApi } };
  }
}

/** Loads Google's sign-in script once. */
function loadGoogleScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.querySelector<HTMLScriptElement>(`script[src="${GOOGLE_SCRIPT}"]`) ?? document.createElement("script");
    if (!script.src) {
      script.src = GOOGLE_SCRIPT;
      script.async = true;
      document.head.appendChild(script);
    }
    script.addEventListener("load", () => resolve());
    script.addEventListener("error", () => reject(new Error("Google sign-in script could not be loaded.")));
  });
}

/**
 * "Google" sign-in. Google's button picks the account; the backend then emails a sign-in code,
 * and the user enters it on the verification page.
 */
export function SocialButtons({ verb }: { verb: "Sign up with" | "" }) {
  const navigate = useNavigate();
  const buttonRef = useRef<HTMLDivElement>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      setNotice("Google sign-in is not set up yet.");
      return;
    }
    let active = true;
    loadGoogleScript()
      .then(() => {
        if (!active || !buttonRef.current || !window.google) return;
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => {
            void handleCredential(response.credential);
          },
        });
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: "outline",
          size: "large",
          text: verb ? "signup_with" : "signin_with",
          shape: "pill",
          width: buttonRef.current.clientWidth,
        });
      })
      .catch(() => {
        if (active) setNotice("Google sign-in could not be loaded. Check your connection.");
      });
    return () => {
      active = false;
    };
    // handleCredential only uses navigate, which is stable.
  }, [verb]);

  async function handleCredential(idToken: string) {
    setNotice(null);
    try {
      const pending = await authApi.googleSignIn(idToken);
      navigate(`/verify-email?email=${encodeURIComponent(pending.email)}&mode=google`);
    } catch (error) {
      setNotice(error instanceof ApiError ? error.message : "Google sign-in failed. Please try again.");
    }
  }

  return (
    <div className="space-y-3">
      <div ref={buttonRef} className="flex min-h-11 justify-center" />
      {notice && <p role="status" className="text-center text-xs text-slate-500">{notice}</p>}
    </div>
  );
}

export function Divider({ children }: { children: string }) {
  return (
    <div className="flex items-center gap-3 text-[11px] font-medium uppercase tracking-wide text-slate-400">
      <span className="h-px flex-1 bg-slate-200" />
      {children}
      <span className="h-px flex-1 bg-slate-200" />
    </div>
  );
}
