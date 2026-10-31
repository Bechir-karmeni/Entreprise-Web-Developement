import { Fragment, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { AppShell } from "../components/AppShell";
import { ApiError } from "../api/http";
import { shoppingApi } from "../api/shoppingApi";
import { useI18n } from "../i18n/useI18n";
import { SHOPPING_CATEGORIES, type PriceOffer, type ShoppingCategory, type ShoppingItem } from "../types/shopping";
import { formatEuro, parseEuroToCents } from "../lib/money";

function errorText(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

/** The shopping list as CSV, one row per item. Prices are in euros with a decimal point. */
function shoppingCsv(items: ShoppingItem[]): string {
  const quote = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const header = ["name", "quantity", "category", "checked", "priceEuro", "barcode"];
  const rows = items.map((item) =>
    [
      item.name,
      item.quantity,
      item.category,
      item.checked ? "yes" : "no",
      item.priceCents === null ? "" : (item.priceCents / 100).toFixed(2),
      item.barcode ?? "",
    ]
      .map(quote)
      .join(","),
  );
  return [header.join(","), ...rows].join("\r\n");
}

function downloadCsv(filename: string, content: string) {
  // The byte order mark makes Excel read the file as UTF-8, so umlauts stay readable.
  const blob = new Blob(["﻿" + content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/** Shows a price in cents as typed in the input, for example 250 becomes "2,50". */
function formatPriceInput(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

export default function ShoppingListPage() {
  const { t, language } = useI18n();
  const [items, setItems] = useState<ShoppingItem[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [category, setCategory] = useState<ShoppingCategory>("PRODUCE");
  const [barcode, setBarcode] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [budget, setBudget] = useState<number | null>(null);
  const [budgetDraft, setBudgetDraft] = useState("");
  const [savingBudget, setSavingBudget] = useState(false);
  const [budgetError, setBudgetError] = useState<string | null>(null);
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});
  const [offersById, setOffersById] = useState<Record<string, PriceOffer[]>>({});
  const [openOffersId, setOpenOffersId] = useState<string | null>(null);
  const [loadingOffersId, setLoadingOffersId] = useState<string | null>(null);

  useEffect(() => {
    shoppingApi
      .list()
      .then(setItems)
      .catch((error: unknown) => setLoadError(errorText(error, t.common.genericError)));
    shoppingApi
      .getBudget()
      .then((saved) => {
        setBudget(saved.amountCents);
        setBudgetDraft(saved.amountCents === null ? "" : formatPriceInput(saved.amountCents));
      })
      .catch((error: unknown) => setBudgetError(errorText(error, t.common.genericError)));
  }, [t.common.genericError]);

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed === "") {
      setActionError(t.shopping.nameRequired);
      return;
    }
    const trimmedBarcode = barcode.trim();
    if (trimmedBarcode !== "" && !/^\d{6,14}$/.test(trimmedBarcode)) {
      setActionError(t.shopping.barcodeInvalid);
      return;
    }
    setAdding(true);
    setActionError(null);
    try {
      const created = await shoppingApi.add({
        name: trimmed,
        quantity: quantity.trim(),
        category,
        barcode: trimmedBarcode === "" ? undefined : trimmedBarcode,
      });
      setItems((current) => [...(current ?? []), created]);
      setName("");
      setQuantity("");
      setBarcode("");
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

  /** Saves the price typed for one item. An empty field clears the price. */
  async function savePrice(item: ShoppingItem) {
    const draft = priceDrafts[item.id];
    if (draft === undefined) return;
    const cents = parseEuroToCents(draft);
    if (cents === undefined) {
      setActionError(t.shopping.priceInvalid);
      return;
    }
    if (cents === item.priceCents) return;
    setBusyId(item.id);
    setActionError(null);
    try {
      const updated = await shoppingApi.setPrice(item.id, cents);
      setItems((current) => (current ?? []).map((existing) => (existing.id === updated.id ? updated : existing)));
      setPriceDrafts((current) => {
        const next = { ...current };
        delete next[item.id];
        return next;
      });
    } catch (error) {
      setActionError(errorText(error, t.common.genericError));
    } finally {
      setBusyId(null);
    }
  }

  async function handleBudgetSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cents = parseEuroToCents(budgetDraft);
    if (cents === undefined) {
      setActionError(t.shopping.priceInvalid);
      return;
    }
    setSavingBudget(true);
    setActionError(null);
    try {
      const saved = await shoppingApi.setBudget(cents);
      setBudget(saved.amountCents);
    } catch (error) {
      setActionError(errorText(error, t.common.genericError));
    } finally {
      setSavingBudget(false);
    }
  }

  /** Moves an item to another category. The list regroups by category once the server confirms. */
  async function changeCategory(item: ShoppingItem, category: ShoppingCategory) {
    if (category === item.category) return;
    setBusyId(item.id);
    setActionError(null);
    try {
      const updated = await shoppingApi.setCategory(item.id, category);
      setItems((current) => (current ?? []).map((existing) => (existing.id === updated.id ? updated : existing)));
    } catch (error) {
      setActionError(errorText(error, t.common.genericError));
    } finally {
      setBusyId(null);
    }
  }

  /** Opens or closes the store prices for one item, loading them the first time. */
  async function toggleOffers(item: ShoppingItem) {
    if (openOffersId === item.id) {
      setOpenOffersId(null);
      return;
    }
    setOpenOffersId(item.id);
    if (offersById[item.id]) return;
    setLoadingOffersId(item.id);
    setActionError(null);
    try {
      const offers = await shoppingApi.prices(item.id);
      setOffersById((current) => ({ ...current, [item.id]: offers }));
    } catch (error) {
      setOpenOffersId(null);
      setActionError(errorText(error, t.common.genericError));
    } finally {
      setLoadingOffersId(null);
    }
  }

  /** Fills in one item's price from a store price the user picked. */
  async function chooseOffer(item: ShoppingItem, offer: PriceOffer) {
    setBusyId(item.id);
    setActionError(null);
    try {
      const updated = await shoppingApi.setPrice(item.id, offer.priceCents);
      setItems((current) => (current ?? []).map((existing) => (existing.id === updated.id ? updated : existing)));
      setPriceDrafts((current) => {
        const next = { ...current };
        delete next[item.id];
        return next;
      });
      setOpenOffersId(null);
    } catch (error) {
      setActionError(errorText(error, t.common.genericError));
    } finally {
      setBusyId(null);
    }
  }

  const list = items ?? [];
  const checkedCount = list.filter((item) => item.checked).length;
  const percent = list.length > 0 ? Math.round((checkedCount / list.length) * 100) : 0;
  const locale = language === "de" ? "de-DE" : "en-GB";
  const pricedTotal = list.reduce((sum, item) => sum + (item.priceCents ?? 0), 0);
  const remaining = budget === null ? 0 : budget - pricedTotal;

  return (
    <AppShell
      title={t.shopping.title}
      subtitle={t.shopping.subtitle}
      actions={
        <>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-100"
          >
            {t.shopping.print}
          </button>
          <button
            type="button"
            onClick={() => downloadCsv("shopping-list.csv", shoppingCsv(items ?? []))}
            disabled={(items ?? []).length === 0}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-100 disabled:opacity-50"
          >
            {t.shopping.export}
          </button>
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
              <h2 className="font-semibold">{t.shopping.budgetTitle}</h2>
              <p className="mt-1 text-xs text-slate-500">{t.shopping.budgetText}</p>
              <form onSubmit={handleBudgetSave} className="mt-3 flex gap-2">
                <input
                  value={budgetDraft}
                  onChange={(event) => setBudgetDraft(event.target.value)}
                  placeholder={t.shopping.budgetPlaceholder}
                  aria-label={t.shopping.budgetLabel}
                  inputMode="decimal"
                  maxLength={10}
                  className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={savingBudget}
                  className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                >
                  {t.shopping.budgetSave}
                </button>
              </form>
              {budgetError && (
                <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                  {budgetError}
                </p>
              )}
              {budget === null ? (
                <p className="mt-3 text-sm text-slate-500">{t.shopping.budgetNone}</p>
              ) : (
                <div className="mt-3 space-y-1 text-sm">
                  <p className="font-semibold text-slate-700">
                    {t.shopping.budgetPlanned
                      .replace("{total}", formatEuro(pricedTotal, locale))
                      .replace("{budget}", formatEuro(budget, locale))}
                  </p>
                  <p className={remaining >= 0 ? "text-emerald-700" : "text-red-700"}>
                    {remaining >= 0
                      ? t.shopping.budgetLeft.replace("{amount}", formatEuro(remaining, locale))
                      : t.shopping.budgetOver.replace("{amount}", formatEuro(-remaining, locale))}
                  </p>
                </div>
              )}
            </section>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <form onSubmit={handleAdd} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
                <h2 className="font-semibold">{t.shopping.quickAdd}</h2>
                <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_8rem_10rem_9rem_auto]">
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder={t.shopping.namePlaceholder}
                    aria-label={t.shopping.namePlaceholder}
                    maxLength={100}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none"
                  />
                  <input
                    value={quantity}
                    onChange={(event) => setQuantity(event.target.value)}
                    placeholder={t.shopping.quantityPlaceholder}
                    aria-label={t.shopping.quantityPlaceholder}
                    maxLength={40}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none"
                  />
                  <input
                    value={barcode}
                    onChange={(event) => setBarcode(event.target.value)}
                    placeholder={t.shopping.barcodePlaceholder}
                    aria-label={t.shopping.barcodePlaceholder}
                    inputMode="numeric"
                    maxLength={14}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none"
                  />
                  <select
                    value={category}
                    onChange={(event) => setCategory(event.target.value as ShoppingCategory)}
                    aria-label={t.shopping.categoryLabel}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
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
                      <Fragment key={item.id}>
                      <li className="flex items-center gap-3 py-3">
                        <input
                          type="checkbox"
                          checked={item.checked}
                          disabled={busyId === item.id}
                          onChange={() => toggle(item)}
                          aria-label={item.name}
                          className="h-4 w-4 accent-emerald-700 [color-scheme:light] bg-white"
                        />
                        <div className="min-w-0 flex-1">
                          <p className={`truncate text-sm font-medium ${item.checked ? "text-slate-400 line-through" : ""}`}>{item.name}</p>
                          {item.quantity && <p className="text-xs text-slate-500">{item.quantity}</p>}
                          {item.barcode && <p className="text-xs text-slate-400">{t.shopping.barcodeLabel}: {item.barcode}</p>}
                        </div>
                        <select
                          value={item.category}
                          onChange={(event) => changeCategory(item, event.target.value as ShoppingCategory)}
                          disabled={busyId === item.id}
                          aria-label={`${t.shopping.categoryLabel}: ${item.name}`}
                          className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 disabled:opacity-50"
                        >
                          {SHOPPING_CATEGORIES.map((option) => (
                            <option key={option} value={option}>
                              {t.shopping.categories[option]}
                            </option>
                          ))}
                        </select>
                        {(
                          <button
                            type="button"
                            onClick={() => toggleOffers(item)}
                            disabled={loadingOffersId === item.id}
                            aria-expanded={openOffersId === item.id}
                            className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium hover:bg-slate-100 disabled:opacity-50"
                          >
                            {t.shopping.pricesButton}
                          </button>
                        )}
                        <input
                          value={priceDrafts[item.id] ?? (item.priceCents === null ? "" : formatPriceInput(item.priceCents))}
                          onChange={(event) => setPriceDrafts((current) => ({ ...current, [item.id]: event.target.value }))}
                          onBlur={() => savePrice(item)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") event.currentTarget.blur();
                          }}
                          disabled={busyId === item.id}
                          placeholder={t.shopping.pricePlaceholder}
                          aria-label={`${t.shopping.priceLabel}: ${item.name}`}
                          inputMode="decimal"
                          maxLength={10}
                          className="w-24 rounded-lg border border-slate-300 bg-white px-2 py-1 text-right text-sm text-slate-900 focus:border-emerald-600 focus:outline-none disabled:opacity-50"
                        />
                        <button
                          type="button"
                          onClick={() => remove(item)}
                          disabled={busyId === item.id}
                          className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium hover:bg-slate-100 disabled:opacity-50"
                        >
                          {t.shopping.remove}
                        </button>
                      </li>
                      {openOffersId === item.id && (
                        <li className="pb-3 pl-7">
                          {loadingOffersId === item.id ? (
                            <p className="text-sm text-slate-500">{t.common.loading}</p>
                          ) : (offersById[item.id] ?? []).length === 0 ? (
                            <p className="text-sm text-slate-500">{t.shopping.pricesNone}</p>
                          ) : (
                            <div className="space-y-2">
                              <p className="text-xs text-slate-500">{t.shopping.pricesHint}</p>
                              {!item.barcode && <p className="text-xs text-amber-700">{t.shopping.pricesByName}</p>}
                              <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
                                {(offersById[item.id] ?? []).map((offer, index) => (
                                  <li
                                    key={`${offer.store}-${offer.date}-${offer.priceCents}`}
                                    className="flex flex-wrap items-center justify-between gap-3 px-3 py-2"
                                  >
                                    <div className="min-w-0">
                                      <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-900">
                                        {offer.store}
                                        {index === 0 && (
                                          <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">
                                            {t.shopping.pricesLowest}
                                          </span>
                                        )}
                                        {offer.discounted && (
                                          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                                            {t.shopping.pricesDiscounted}
                                          </span>
                                        )}
                                      </p>
                                      {offer.product && <p className="text-xs font-medium text-slate-700">{offer.product}</p>}
                                      <p className="text-xs text-slate-500">
                                        {offer.brand ? `${offer.brand} · ` : ""}
                                        {offer.date}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <span className="text-base font-bold text-slate-900">{formatEuro(offer.priceCents, locale)}</span>
                                      <button
                                        type="button"
                                        onClick={() => chooseOffer(item, offer)}
                                        disabled={busyId === item.id}
                                        className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                                      >
                                        {t.shopping.pricesUse}
                                      </button>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                              <p className="text-[10px] text-slate-400">{t.shopping.pricesSource}</p>
                            </div>
                          )}
                        </li>
                      )}
                      </Fragment>
                    ))}
                  </CategoryCard>
                );
              })}
            </div>

            <div className="space-y-4">
              <StoreWalkCard items={list} />
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

/** The order a shopper usually walks a store: fresh produce first, dry goods last. */
const STORE_WALK: ShoppingCategory[] = ["PRODUCE", "DAIRY", "PROTEIN", "GRAINS_PANTRY", "OTHER"];

/** Items still to buy, grouped by category in store-walk order. Uses only the list itself. */
function StoreWalkCard({ items }: { items: ShoppingItem[] }) {
  const { t } = useI18n();
  const open = items.filter((item) => !item.checked);
  const steps = STORE_WALK.map((category) => ({
    category,
    count: open.filter((item) => item.category === category).length,
  })).filter((step) => step.count > 0);

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
      <h2 className="font-semibold">{t.shopping.organizerTitle}</h2>
      <p className="mt-1 text-xs text-slate-500">{t.shopping.organizerText}</p>
      {steps.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">{t.shopping.storeWalkNone}</p>
      ) : (
        <ol className="mt-4 space-y-2 text-sm">
          {steps.map((step, index) => (
            <li key={step.category} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 font-medium text-slate-700">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-50 text-xs font-semibold text-emerald-800">
                  {index + 1}
                </span>
                {t.shopping.categories[step.category]}
              </span>
              <span className="text-xs text-slate-500">{t.shopping.storeWalkCount.replace("{count}", String(step.count))}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}


