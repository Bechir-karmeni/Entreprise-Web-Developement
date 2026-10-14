import type { ReactNode } from "react";
import { AppShell } from "../components/AppShell";
import { useI18n } from "../i18n/useI18n";

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const MEALS = ["BREAKFAST", "LUNCH", "DINNER", "SNACK"] as const;

export default function MealPlannerPage() {
  const { t } = useI18n();
  return (
    <AppShell
      title={t.mealPlanner.title}
      subtitle={t.mealPlanner.subtitle}
      actions={
        <>
          <SoonButton label={t.mealPlanner.generate} />
          <SoonButton label={t.mealPlanner.export} />
        </>
      }
    >
      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">{t.mealPlanner.weekTitle}</h2>
          <SoonBadge />
        </div>
        <p className="mt-2 text-sm text-slate-500">{t.mealPlanner.weekText}</p>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-7">
          {DAYS.map((day) => (
            <div key={day} className="rounded-xl bg-slate-50 p-3">
              <p className="text-sm font-semibold">{t.mealPlanner.days[day]}</p>
              <p className="mt-0.5 text-xs text-slate-500">{t.mealPlanner.noTotals}</p>
              <ul className="mt-3 space-y-2">
                {MEALS.map((meal) => (
                  <li key={meal} className="rounded-lg border border-dashed border-slate-300 bg-white p-2">
                    <p className="text-[11px] font-medium text-slate-500">{t.mealPlanner.meals[meal]}</p>
                    <p className="text-xs text-slate-400">{t.common.comingSoon}</p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <SoonCard title={t.mealPlanner.wizardTitle} text={t.mealPlanner.wizardText} />
        <SoonCard title={t.mealPlanner.macroTitle} text={t.mealPlanner.macroText} />
        <SoonCard title={t.mealPlanner.shoppingTitle} text={t.mealPlanner.shoppingText} />
      </div>
    </AppShell>
  );
}

function SoonBadge() {
  const { t } = useI18n();
  return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase text-slate-500">{t.common.comingSoon}</span>;
}

function SoonButton({ label }: { label: string }) {
  const { t } = useI18n();
  return (
    <button type="button" disabled className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-400">
      {label}
      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase">{t.common.comingSoon}</span>
    </button>
  );
}

function SoonCard({ title, text }: { title: string; text: string }): ReactNode {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">{title}</h2>
        <SoonBadge />
      </div>
      <p className="mt-2 text-sm text-slate-500">{text}</p>
    </section>
  );
}
