import { useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { MealLogDialog } from "./MealLogDialog";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { LunchSuggestionHost } from "./LunchSuggestionHost";
import { useAuth } from "../auth/useAuth";
import { useI18n } from "../i18n/useI18n";

type NavKey =
  | "dashboard"
  | "today"
  | "mealPlanner"
  | "foodTracking"
  | "recipes"
  | "shoppingList"
  | "progress"
  | "analytics";

/** Sections with an href exist; the others are shown but marked as coming soon. */
const NAV_ITEMS: { key: NavKey; href: string | null }[] = [
  { key: "dashboard", href: "/dashboard" },
  { key: "today", href: "/today" },
  { key: "mealPlanner", href: "/meal-planner" },
  { key: "foodTracking", href: "/food-tracking" },
  { key: "recipes", href: "/recipes" },
  { key: "shoppingList", href: "/shopping-list" },
  { key: "progress", href: "/progress" },
  { key: "analytics", href: "/analytics" },
];

interface AppShellProps {
  title: string;
  subtitle?: string;
  /** Buttons shown on the right of the page title. */
  actions?: ReactNode;
  /** Short text for the top bar, for example today's calories. */
  topStat?: string;
  children: ReactNode;
}

export function AppShell({ title, subtitle, actions, topStat, children }: AppShellProps) {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const [logOpen, setLogOpen] = useState(false);

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  const initial = user?.firstName?.charAt(0).toUpperCase() ?? "?";

  return (
    <div className="min-h-screen bg-[#f6f7fb] text-slate-900 lg:flex">
      <aside className="flex flex-col border-b border-slate-200 bg-white p-4 lg:w-64 lg:shrink-0 lg:border-b-0 lg:border-r lg:p-6">
        <div className="flex items-center gap-2">
          <img src="/logo.svg" alt="" width={32} height={32} className="h-8 w-8" />
          <span className="text-lg font-bold tracking-tight text-emerald-900">NutriDay</span>
          <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold tracking-wider text-emerald-700">
            NUTRITION
          </span>
        </div>

        <nav className="mt-6 flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
          {NAV_ITEMS.map(({ key, href }) => {
            if (href === null) {
              return (
                <span
                  key={key}
                  className="flex items-center justify-between gap-3 whitespace-nowrap rounded-lg px-3 py-2 text-sm text-slate-400"
                >
                  {t.nav[key]}
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase">
                    {t.common.comingSoon}
                  </span>
                </span>
              );
            }
            const active = location.pathname === href;
            return (
              <Link
                key={key}
                to={href}
                aria-current={active ? "page" : undefined}
                className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium ${
                  active ? "bg-emerald-700 text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {t.nav[key]}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto hidden pt-8 lg:block">
          <span className="block px-3 py-2 text-sm text-slate-400">
            {t.common.aiAssistant} <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] uppercase">{t.common.comingSoon}</span>
          </span>
          <span className="block px-3 py-2 text-sm text-slate-400">
            {t.common.settings} <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] uppercase">{t.common.comingSoon}</span>
          </span>
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-slate-200 p-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-800">
              {initial}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{user?.firstName ?? ""}</p>
              <p className="text-xs text-slate-500">{t.common.member}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-3 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-slate-100"
          >
            {t.common.logout}
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
          <div className="min-w-0 flex-1 basis-56">
            <input
              type="search"
              aria-label={t.common.searchPlaceholder}
              placeholder={t.common.searchPlaceholder}
              className="w-full rounded-lg bg-slate-100 px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>
          {topStat && (
            <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-800">{topStat}</span>
          )}
          <button
            type="button"
            onClick={() => setLogOpen(true)}
            className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            + {t.common.logMeal}
          </button>
          {logOpen && <MealLogDialog onClose={() => setLogOpen(false)} />}
          <LunchSuggestionHost />
          <LanguageSwitcher />
          <button
            type="button"
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-slate-100"
            onClick={handleLogout}
          >
            {t.common.logout}
          </button>
        </header>

        <div className="p-4 sm:p-6 lg:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
              {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
            </div>
            {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
          </div>
          <main className="mt-6 space-y-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
