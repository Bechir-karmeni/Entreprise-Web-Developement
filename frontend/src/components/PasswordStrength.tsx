import { getPasswordStrength } from "../lib/validation";

/** Four-bar strength meter. Shows nothing until the user has typed a password. */
export function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const { score, label } = getPasswordStrength(password);
  const barColor = score <= 1 ? "bg-red-500" : score === 2 ? "bg-amber-400" : "bg-emerald-600";

  return (
    <div className="-mt-1 space-y-2" aria-live="polite">
      <div className="grid grid-cols-4 gap-1.5">
        {[0, 1, 2, 3].map((index) => (
          <span key={index} className={`h-1.5 rounded-full ${index < score ? barColor : "bg-slate-200"}`} />
        ))}
      </div>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className={score === 4 ? "font-medium text-emerald-700" : "text-slate-600"}>● {label}</span>
        <span className="text-slate-500">Passed {score}/4</span>
      </div>
    </div>
  );
}
