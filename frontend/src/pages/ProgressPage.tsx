import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AppShell } from "../components/AppShell";
import { ApiError } from "../api/http";
import { foodApi } from "../api/foodApi";
import { nutritionApi } from "../api/nutritionApi";
import { profileApi } from "../api/profileApi";
import { useI18n } from "../i18n/useI18n";
import { localDateIso } from "../lib/foodLog";
import type { NutrientTotals } from "../types/food";
import type { TargetsResponse } from "../types/nutrition";
import type { ProfileResponse } from "../types/profile";

type State =
  | { status: "loading" }
  | { status: "noProfile" }
  | { status: "error"; message?: string }
  | { status: "ready"; profile: ProfileResponse; targets: TargetsResponse; totals: NutrientTotals };

const EMPTY_TOTALS: NutrientTotals = { calories: 0, proteinGrams: 0, carbsGrams: 0, fatGrams: 0, fiberGrams: 0 };

export default function ProgressPage() {
  const { t } = useI18n();
  const [state, setState] = useState<State>({ status: "loading" });
  const today = useMemo(() => localDateIso(new Date()), []);

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([profileApi.get(), nutritionApi.getTargets(), foodApi.getDay(today)]).then(
      ([profileResult, targetsResult, dayResult]) => {
        if (cancelled) return;
        const failed = profileResult.status === "rejected" ? profileResult.reason : targetsResult.status === "rejected" ? targetsResult.reason : null;
        if (failed) {
          if (failed instanceof ApiError && failed.status === 404) {
            setState({ status: "noProfile" });
          } else {
            setState({ status: "error", message: failed instanceof ApiError ? failed.message : undefined });
          }
          return;
        }
        if (profileResult.status !== "fulfilled" || targetsResult.status !== "fulfilled") return;
        setState({
          status: "ready",
          profile: profileResult.value,
          targets: targetsResult.value,
          totals: dayResult.status === "fulfilled" ? dayResult.value.totals : EMPTY_TOTALS,
        });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [today]);

  const topStat =
    state.status === "ready" ? `${state.totals.calories.toLocaleString()} / ${state.targets.calories.toLocaleString()} kcal` : undefined;

  return (
    <AppShell
      title={t.progress.title}
      subtitle={t.progress.subtitle}
      topStat={topStat}
      actions={
        <div className="flex flex-wrap gap-1 rounded-lg bg-white p-1 ring-1 ring-slate-200">
          {["7D", "30D", "3M", "6M", "1Y"].map((period) => (
            <button
              key={period}
              type="button"
              disabled
              title={t.common.comingSoon}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                period === "30D" ? "bg-emerald-700 text-white" : "text-slate-400"
              }`}
            >
              {period}
            </button>
          ))}
        </div>
      }
    >
      {state.status === "loading" && <p className="text-sm text-slate-600">{t.common.loading}</p>}

      {state.status === "error" && (
        <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
          {state.message ?? t.common.genericError}
        </p>
      )}

      {state.status === "noProfile" && (
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70">
          <p className="font-medium">{t.progress.noProfile}</p>
        </section>
      )}

      {state.status === "ready" && <ReadyView profile={state.profile} targets={state.targets} totals={state.totals} />}
    </AppShell>
  );
}

function ReadyView({ profile, targets, totals }: { profile: ProfileResponse; targets: TargetsResponse; totals: NutrientTotals }) {
  const { t } = useI18n();
  const caloriesPercent = percentOf(totals.calories, targets.calories);
  const proteinPercent = percentOf(totals.proteinGrams, targets.proteinGrams);

  return (
    <>
      <section className="grid gap-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-white p-6 ring-1 ring-slate-200/70 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">{t.progress.mainFocus}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight">{t.progress.goals[profile.goal]}</p>
          <p className="mt-2 text-sm text-slate-600">
            {t.progress.activity}: {t.progress.activityLevels[profile.activityLevel]}
          </p>
          <p className="mt-3 text-xs text-slate-500">{t.progress.focusNote}</p>
        </div>
        <div className="flex flex-col justify-center rounded-xl bg-white p-4 ring-1 ring-slate-200">
          <p className="text-xs text-slate-500">{t.progress.currentWeight}</p>
          <p className="mt-1 text-3xl font-bold">
            {profile.weightKg.toFixed(1)} <span className="text-base font-medium text-slate-500">kg</span>
          </p>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label={t.progress.currentWeight} value={`${profile.weightKg.toFixed(1)} kg`} />
        <StatCard
          label={t.progress.caloriesToday}
          value={`${caloriesPercent}%`}
          detail={t.progress.ofTarget.replace("{target}", `${targets.calories.toLocaleString()} kcal`)}
        />
        <StatCard
          label={t.progress.proteinToday}
          value={`${proteinPercent}%`}
          detail={t.progress.ofTarget.replace("{target}", `${targets.proteinGrams} g`)}
        />
      </div>

      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70">
        <h2 className="font-semibold">{t.progress.goalStatusTitle}</h2>
        <p className="text-xs text-slate-500">{t.progress.goalStatusSubtitle}</p>
        <div className="mt-5 space-y-5">
          <GoalRow label={t.progress.calories} consumed={totals.calories} target={targets.calories} unit="kcal" ofText={t.progress.ofTarget} statusText={statusLabel(caloriesPercent, t.progress)} />
          <GoalRow label={t.progress.protein} consumed={totals.proteinGrams} target={targets.proteinGrams} unit="g" ofText={t.progress.ofTarget} statusText={statusLabel(proteinPercent, t.progress)} />
          <GoalRow label={t.progress.carbs} consumed={totals.carbsGrams} target={targets.carbsGrams} unit="g" ofText={t.progress.ofTarget} statusText={statusLabel(percentOf(totals.carbsGrams, targets.carbsGrams), t.progress)} />
          <GoalRow label={t.progress.fat} consumed={totals.fatGrams} target={targets.fatGrams} unit="g" ofText={t.progress.ofTarget} statusText={statusLabel(percentOf(totals.fatGrams, targets.fatGrams), t.progress)} />
          <GoalRow label={t.progress.fiber} consumed={totals.fiberGrams} target={targets.fiberGrams} unit="g" ofText={t.progress.ofTarget} statusText={statusLabel(percentOf(totals.fiberGrams, targets.fiberGrams), t.progress)} />
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <SoonCard title={t.progress.weightTitle} text={t.progress.weightText} />
        <SoonCard title={t.progress.consistencyTitle} text={t.progress.consistencyText} />
        <SoonCard title={t.progress.streakTitle} text={t.progress.streakText} />
        <SoonCard title={t.progress.achievementsTitle} text={t.progress.achievementsText} />
        <SoonCard title={t.progress.insightTitle} text={t.progress.insightText} />
        <SoonCard title={t.progress.copilotTitle} text={t.progress.copilotText} />
      </div>
    </>
  );
}

function percentOf(consumed: number, target: number): number {
  return target > 0 ? Math.round((consumed / target) * 100) : 0;
}

function statusLabel(percent: number, labels: { statusOn: string; statusBelow: string; statusAbove: string }): string {
  if (percent < 90) return labels.statusBelow;
  if (percent > 110) return labels.statusAbove;
  return labels.statusOn;
}

function StatCard({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
      <p className="text-sm text-slate-600">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
      {detail && <p className="mt-1 text-xs text-slate-500">{detail}</p>}
    </div>
  );
}

function GoalRow({
  label,
  consumed,
  target,
  unit,
  ofText,
  statusText,
}: {
  label: string;
  consumed: number;
  target: number;
  unit: string;
  ofText: string;
  statusText: string;
}) {
  const percent = percentOf(consumed, target);
  const onTarget = percent >= 90 && percent <= 110;
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <p className="font-medium">{label}</p>
        <p className="text-slate-600">
          {Math.round(consumed * 10) / 10} {unit} <span className="text-slate-400">{ofText.replace("{target}", `${target} ${unit}`)}</span>
        </p>
      </div>
      <div className="mt-2 flex items-center gap-3">
        <div className="h-2 flex-1 rounded-full bg-slate-100" aria-hidden="true">
          <div className={`h-2 rounded-full ${onTarget ? "bg-emerald-600" : "bg-amber-500"}`} style={{ width: `${Math.min(100, percent)}%` }} />
        </div>
        <span className={`w-28 shrink-0 text-right text-xs font-semibold ${onTarget ? "text-emerald-700" : "text-amber-700"}`}>
          {percent}% · {statusText}
        </span>
      </div>
    </div>
  );
}

function SoonCard({ title, text }: { title: string; text: string }): ReactNode {
  const { t } = useI18n();
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">{title}</h2>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase text-slate-500">{t.common.comingSoon}</span>
      </div>
      <p className="mt-2 text-sm text-slate-500">{text}</p>
    </section>
  );
}
