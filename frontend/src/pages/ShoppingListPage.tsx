import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { AppShell } from "../components/AppShell";
import { ApiError } from "../api/http";
import { shoppingApi } from "../api/shoppingApi";
import { useI18n } from "../i18n/useI18n";
import { SHOPPING_CATEGORIES, type ShoppingCategory, type ShoppingItem } from "../types/shopping";

function errorText(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

export default function ShoppingListPage() {
  const { t } = useI18n();
  const [items, setItems] = useState<ShoppingItem[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [category, setCategory] = useState<ShoppingCategory>("PRODUCE");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    shoppingApi
      .list()
      .then(setItems)
      .catch((error: unknown) => setLoadError(errorText(error, t.common.genericError)));
  }, [t.common.genericError]);

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed === "") {
      setActionError(t.shopping.nameRequired);
      return;
    }
    setAdding(true);
    setActionError(null);
    try {
      const created = await shoppingApi.add({ name: trimmed, quantity: quantity.trim(), category });
      setItems((current) => [...(current ?? []), created]);
      setName("");
      setQuantity("");
    } catch (error) {
      setActionError(errorText(error, t.common.genericError));
    } finally {
      setAdding(false);
    }
  }

  async function toggle(item: ShoppingItem) {
    setBusyId(item.id);
    setActionError(null);
    try {
      const updated = await shoppingApi.setChecked(item.id, !item.checked);
      setItems((current) => (current ?? []).map((existing) => (existing.id === updated.id ? updated : existing)));
    } catch (error) {
      setActionError(errorText(error, t.common.genericError));
    } finally {
      setBusyId(null);
    }
  }

  async function remove(item: ShoppingItem) {
    setBusyId(item.id);
    setActionError(null);
    try {
      await shoppingApi.remove(item.id);
      setItems((current) => (current ?? []).filter((existing) => existing.id !== item.id));
    } catch (error) {
      setActionError(errorText(error, t.common.genericError));
    } finally {
      setBusyId(null);
    }
  }

  const list = items ?? [];
  const checkedCount = list.filter((item) => item.checked).length;
  const percent = list.length > 0 ? Math.round((checkedCount / list.length) * 100) : 0;

  return (
    <AppShell
      title={t.shopping.title}
      subtitle={t.shopping.subtitle}
      actions={
        <>
          <SoonButton label={t.shopping.print} />
          <SoonButton label={t.shopping.export} />
        </>
      }
    >
      {loadError && (
        <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
          {loadError}
        </p>
      )}

      {items === null && !loadError && <p className="text-sm text-slate-600">{t.common.loading}</p>}

      {items !== null && (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70 lg:col-span-2">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-semibold">{t.shopping.progressTitle}</h2>
                <p className="text-sm font-semibold text-slate-700">
                  {t.shopping.checkedOf.replace("{done}", String(checkedCount)).replace("{total}", String(list.length))}
                </p>
              </div>
              <div className="mt-3 h-2 rounded-full bg-slate-100" aria-hidden="true">
                <div className="h-2 rounded-full bg-emerald-600" style={{ width: `${percent}%` }} />
              </div>
              <p className="mt-2 text-xs text-slate-500">{t.shopping.syncNote}</p>
            </section>

            <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-semibold">{t.shopping.budgetTitle}</h2>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase text-slate-500">{t.common.comingSoon}</span>
              </div>
              <p className="mt-2 text-sm text-slate-500">{t.shopping.budgetText}</p>
            </section>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <form onSubmit={handleAdd} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
                <h2 className="font-semibold">{t.shopping.quickAdd}</h2>
                <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_8rem_10rem_auto]">
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder={t.shopping.namePlaceholder}
                    aria-label={t.shopping.namePlaceholder}
                    maxLength={100}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
                  />
                  <input
                    value={quantity}
                    onChange={(event) => setQuantity(event.target.value)}
                    placeholder={t.shopping.quantityPlaceholder}
                    aria-label={t.shopping.quantityPlaceholder}
                    maxLength={40}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
                  />
                  <select
                    value={category}
                    onChange={(event) => setCategory(event.target.value as ShoppingCategory)}
                    aria-label={t.shopping.categoryLabel}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  >
                    {SHOPPING_CATEGORIES.map((option) => (
                      <option key={option} value={option}>
                        {t.shopping.categories[option]}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    disabled={adding}
                    className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                  >
                    {t.shopping.add}
                  </button>
                </div>
                {actionError && (
                  <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                    {actionError}
                  </p>
                )}
              </form>

              {list.length === 0 && (
                <p className="rounded-2xl bg-white p-6 text-sm text-slate-500 shadow-sm ring-1 ring-slate-200/70">{t.shopping.empty}</p>
              )}

              {SHOPPING_CATEGORIES.map((category) => {
                const inCategory = list.filter((item) => item.category === category);
                if (inCategory.length === 0) return null;
                return (
                  <CategoryCard key={category} title={t.shopping.categories[category]} count={inCategory.length}>
                    {inCategory.map((item) => (
                      <li key={item.id} className="flex items-center gap-3 py-3">
                        <input
                          type="checkbox"
                          checked={item.checked}
                          disabled={busyId === item.id}
                          onChange={() => toggle(item)}
                          aria-label={item.name}
                          className="h-4 w-4 accent-emerald-700"
                        />
                        <div className="min-w-0 flex-1">
                          <p className={`truncate text-sm font-medium ${item.checked ? "text-slate-400 line-through" : ""}`}>{item.name}</p>
                          {item.quantity && <p className="text-xs text-slate-500">{item.quantity}</p>}
                        </div>
                        <button
                          type="button"
                          onClick={() => remove(item)}
                          disabled={busyId === item.id}
                          className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium hover:bg-slate-100 disabled:opacity-50"
                        >
                          {t.shopping.remove}
                        </button>
                      </li>
                    ))}
                  </CategoryCard>
                );
              })}
            </div>

            <div className="space-y-4">
              <SoonCard title={t.shopping.organizerTitle} text={t.shopping.organizerText} />
              <SoonCard title={t.shopping.deliveryTitle} text={t.shopping.deliveryText} />
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}

function CategoryCard({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  const { t } = useI18n();
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">{title}</h2>
        <span className="text-xs text-slate-500">{t.shopping.itemCount.replace("{count}", String(count))}</span>
      </div>
      <ul className="mt-2 divide-y divide-slate-100">{children}</ul>
    </section>
  );
}

function SoonCard({ title, text }: { title: string; text: string }) {
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

function SoonButton({ label }: { label: string }) {
  const { t } = useI18n();
  return (
    <button type="button" disabled className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-400">
      {label}
      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase">{t.common.comingSoon}</span>
    </button>
  );
}
