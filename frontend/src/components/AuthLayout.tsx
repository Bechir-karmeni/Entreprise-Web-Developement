import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeftIcon, ShieldIcon } from "./icons";
import { BrandMark } from "./BrandMark";

interface AuthLayoutProps {
  children: ReactNode;
  panel: ReactNode;
}

/** Two-column page used by the login and sign-up screens (matches the design mockups). */
export function AuthLayout({ children, panel }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-[#f6f7fb] text-slate-900">
      <header className="flex items-center justify-between px-6 py-6 md:px-12">
        <BrandMark />
        <Link to="/" className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900">
          <ArrowLeftIcon className="h-4 w-4" /> Back to Home
        </Link>
      </header>

      <main className="grid flex-1 items-start gap-6 px-6 pb-10 md:px-12 lg:grid-cols-2 lg:gap-8">
        <section className="flex justify-center lg:justify-end">{children}</section>
        <aside className="w-full space-y-6">{panel}</aside>
      </main>

      <footer className="flex flex-col gap-3 px-6 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between md:px-12">
        <span className="flex items-center gap-1.5">
          <ShieldIcon className="h-3.5 w-3.5 text-emerald-700" /> 256-bit encrypted metabolic data security
        </span>
        <nav className="flex gap-5">
          <a href="#" className="hover:text-slate-800">Privacy Policy</a>
          <a href="#" className="hover:text-slate-800">Terms of Service</a>
          <a href="#" className="hover:text-slate-800">Security Assurance</a>
        </nav>
      </footer>
    </div>
  );
}
