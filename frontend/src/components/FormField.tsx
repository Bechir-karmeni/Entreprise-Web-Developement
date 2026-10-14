import { useId, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { CheckCircleIcon, EyeIcon, EyeOffIcon, LockIcon as LockGlyph } from "./icons";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: ReactNode;
  icon?: ReactNode;
  trailing?: ReactNode;
}

export function FormField({ label, error, hint, icon, trailing, id, className = "", ...inputProps }: FieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={inputId} className="text-sm font-medium text-slate-800">
          {label}
        </label>
        {hint}
      </div>
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">{icon}</span>
        )}
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={`h-11 w-full rounded-lg border-0 bg-[#f2f4fb] text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:ring-2 ${
            icon ? "pl-10" : "pl-3.5"
          } ${trailing ? "pr-20" : "pr-3.5"} ${error ? "ring-2 ring-red-400" : "focus:ring-emerald-600/40"} ${className}`}
          {...inputProps}
        />
        {trailing && <span className="absolute right-3.5 top-1/2 flex -translate-y-1/2 items-center gap-2">{trailing}</span>}
      </div>
      {error && (
        <p id={errorId} className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

interface PasswordFieldProps extends Omit<FieldProps, "type" | "trailing" | "icon"> {
  matched?: boolean;
}

/** Password input with a show/hide button and an optional green tick when the confirmation matches. */
export function PasswordField({ matched = false, ...props }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  return (
    <FormField
      {...props}
      type={visible ? "text" : "password"}
      icon={<LockGlyph />}
      trailing={
        <>
          {matched && <CheckCircleIcon className="h-5 w-5 text-emerald-700" />}
          <button
            type="button"
            onClick={() => setVisible((current) => !current)}
            aria-label={visible ? "Hide password" : "Show password"}
            className="text-slate-400 hover:text-slate-700"
          >
            {visible ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
          </button>
        </>
      }
    />
  );
}
