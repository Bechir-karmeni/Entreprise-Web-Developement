import { useState } from "react";
import { AppleIcon } from "./icons";

/**
 * Google and Apple sign-in buttons from the design. The backend has no OAuth yet,
 * so clicking them only shows a notice.
 */
export function SocialButtons({ verb }: { verb: "Sign up with" | "" }) {
  const [notice, setNotice] = useState<string | null>(null);
  const label = (provider: string) => (verb ? `${verb} ${provider}` : provider);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setNotice("Google sign-in is not part of this version.")}
          className="flex h-11 items-center justify-center gap-2 rounded-lg bg-[#f2f4fb] text-sm font-medium text-slate-800 hover:bg-[#e8ebf6]"
        >
          <span className="text-base font-bold text-[#4285F4]">G</span>
          {label("Google")}
        </button>
        <button
          type="button"
          onClick={() => setNotice("Apple sign-in is not part of this version.")}
          className="flex h-11 items-center justify-center gap-2 rounded-lg bg-[#f2f4fb] text-sm font-medium text-slate-800 hover:bg-[#e8ebf6]"
        >
          <AppleIcon className="h-4 w-4" />
          {label("Apple")}
        </button>
      </div>
      {notice && <p className="text-center text-xs text-slate-500">{notice}</p>}
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
