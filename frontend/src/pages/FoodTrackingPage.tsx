import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { AppShell } from "../components/AppShell";
import { QuickAddFoodDialog } from "../components/QuickAddFoodDialog";
import { MealPhotoScan } from "../components/MealPhotoScan";
import { ApiError } from "../api/http";
import { foodApi } from "../api/foodApi";
import { shoppingApi } from "../api/shoppingApi";
import { nutritionApi } from "../api/nutritionApi";
import { useI18n } from "../i18n/useI18n";
import { useFoodLogChanged } from "../lib/foodEvents";
import { addRecentScan, readRecentScans, withBarcode, writeRecentScans, type RecentScan } from "../lib/recentScans";
import type { Messages } from "../i18n/en";
import { MEAL_ORDER, defaultMealFor, formatAllergen, localDateIso, parseAmount } from "../lib/foodLog";
import type { DayLog, FoodItem, FoodSource, MealType } from "../types/food";
import type { TargetsResponse } from "../types/nutrition";

const MIN_QUERY_LENGTH = 3;
const BARCODE_PATTERN = /^\d{6,14}$/;

/** Filter chips. Common and Branded search the shared foods; Custom searches the user's own foods. */
type FoodView = "COMMON" | "BRANDED" | "FAVORITES" | "CUSTOM";
type InputMode = "SEARCH" | "BARCODE";

function errorText(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

function sourceLabel(source: FoodSource, labels: Messages["food"]): string {
  if (source === "USDA") return labels.sourceUsda;
  if (source === "OPEN_FOOD_FACTS") return labels.sourceOpenFoodFacts;
  if (source === "CUSTOM") return labels.sourceCustom;
  return labels.sourceLocal;
}

export default function FoodTrackingPage() {
  const { t } = useI18n();
  const today = useMemo(() => localDateIso(new Date()), []);
  const [meal, setMeal] = useState<MealType>(() => defaultMealFor(new Date().getHours()));
  const [view, setView] = useState<FoodView>("COMMON");
  const [mode, setMode] = useState<InputMode>("SEARCH");
  const photoRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [barcodeText, setBarcodeText] = useState("");
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null);
  const [shoppingNotice, setShoppingNotice] = useState<string | null>(null);
  const [addingToShopping, setAddingToShopping] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [recentScans, setRecentScans] = useState<RecentScan[]>(() => readRecentScans());
  const [favorites, setFavorites] = useState<FoodItem[]>([]);
  const [localResults, setLocalResults] = useState<FoodItem[]>([]);
  const [onlineResults, setOnlineResults] = useState<FoodItem[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [onlineBusy, setOnlineBusy] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [day, setDay] = useState<DayLog | null>(null);
  const [targets, setTargets] = useState<TargetsResponse | null>(null);
  const [dayError, setDayError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useFoodLogChanged(() => {
    void loadDay();
  });

  async function loadDay() {
    try {
      setDay(await foodApi.getDay(today));
      setDayError(null);
    } catch (error) {
      setDayError(errorText(error, t.food.loadError));
    }
  }

  useEffect(() => {
    loadDay();
    nutritionApi
      .getTargets()
      .then(setTargets)
      .catch(() => setTargets(null));
    foodApi
      .favorites()
      .then(setFavorites)
      .catch(() => setFavorites([]));
    // Loaded once for today's date; the page is not reloaded when the date changes.
  }, []);

  // Local search. Shared foods need 3 characters; the user's own foods are listed even without text.
  // Favorites and barcode mode do not use this search.
  useEffect(() => {
    const text = query.trim();
    setOnlineResults(null);
    setSearchError(null);
    const searchable = mode === "SEARCH" && view !== "FAVORITES";
    const enough = view === "CUSTOM" || text.length >= MIN_QUERY_LENGTH;
    if (!searchable || !enough) {
      setLocalResults([]);
      setSearching(false);
      return;
    }
    const scope = view === "CUSTOM" ? "CUSTOM" : "COMMON";
    let cancelled = false;
    setSearching(true);
    const timer = window.setTimeout(() => {
      foodApi
        .search(text, scope)
        .then((page) => {
          if (!cancelled) setLocalResults(page.content);
        })
        .catch((error: unknown) => {
          if (!cancelled) setSearchError(errorText(error, t.common.genericError));
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, view, mode, t.common.genericError]);

  async function searchOnline() {
    const text = query.trim();
    if (text.length < MIN_QUERY_LENGTH) return;
    setOnlineBusy(true);
    setSearchError(null);
    try {
      setOnlineResults(await foodApi.searchOnline(text));
    } catch (error) {
      setSearchError(errorText(error, t.common.genericError));
    } finally {
      setOnlineBusy(false);
    }
  }

  /** Looks up a barcode typed by hand or read by the camera, and remembers the product in Recent Scans. */
  async function lookupBarcode(code: string) {
    const digits = code.replace(/\s/g, "");
    setBarcodeText(digits);
    setScanning(false);
    if (!BARCODE_PATTERN.test(digits)) {
      setOnlineResults(null);
      setSearchError(t.food.barcodeInvalid);
      return;
    }
    setOnlineBusy(true);
    setSearchError(null);
    try {
      const food = await foodApi.barcode(digits);
      setOnlineResults([food]);
      setScannedBarcode(digits);
      setShoppingNotice(null);
      const next = addRecentScan(recentScans, withBarcode(food, digits));
      setRecentScans(next);
      writeRecentScans(next);
    } catch (error) {
      setOnlineResults(null);
      setScannedBarcode(null);
      setSearchError(errorText(error, t.common.genericError));
    } finally {
      setOnlineBusy(false);
    }
  }

  function handleBarcodeSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void lookupBarcode(barcodeText);
  }

  /** Adds the scanned product to the shopping list, with its barcode so its store prices can be looked up. */
  async function addToShopping(food: FoodItem, barcode: string) {
    setAddingToShopping(true);
    setActionError(null);
    setShoppingNotice(null);
    try {
      await shoppingApi.add({
        name: food.name.slice(0, 100),
        quantity: `${food.servingSize} ${food.servingUnit}`.slice(0, 40),
        category: "OTHER",
        barcode,
      });
      setShoppingNotice(t.food.addedToShopping);
    } catch (error) {
      setActionError(errorText(error, t.common.genericError));
    } finally {
      setAddingToShopping(false);
    }
  }

  function changeMode(next: InputMode) {
    setMode(next);
    setScanning(false);
    setActionError(null);
  }

  async function addFood(food: FoodItem) {
    const amount = parseAmount(amounts[food.id] ?? String(food.servingSize));
    if (amount === null) {
      setActionError(t.food.invalidAmount);
      return;
    }
    setBusyId(food.id);
    setActionError(null);
    try {
      await foodApi.addEntry({ foodId: food.id, mealType: meal, date: today, amount });
      await loadDay();
    } catch (error) {
      setActionError(errorText(error, t.common.genericError));
    } finally {
      setBusyId(null);
    }
  }

  async function removeEntry(id: string) {
    setBusyId(id);
    setActionError(null);
    try {
      await foodApi.deleteEntry(id);
      await loadDay();
    } catch (error) {
      setActionError(errorText(error, t.common.genericError));
    } finally {
      setBusyId(null);
    }
  }

  async function deleteCustomFood(food: FoodItem) {
    if (!window.confirm(t.food.confirmDelete)) return;
    setBusyId(food.id);
    setActionError(null);
    try {
      await foodApi.deleteFood(food.id);
      setLocalResults((current) => current.filter((item) => item.id !== food.id));
      setFavorites((current) => current.filter((item) => item.id !== food.id));
    } catch (error) {
      setActionError(errorText(error, t.common.genericError));
    } finally {
      setBusyId(null);
    }
  }

  async function toggleFavorite(food: FoodItem) {
    const wasFavorite = favoriteIds.has(food.id);
    setActionError(null);
    try {
      await foodApi.setFavorite(food.id, !wasFavorite);
      setFavorites((current) =>
        wasFavorite
          ? current.filter((item) => item.id !== food.id)
          : [food, ...current.filter((item) => item.id !== food.id)],
      );
    } catch (error) {
      setActionError(errorText(error, t.common.genericError));
    }
  }

  function handleCustomFoodCreated(food: FoodItem, addAnother: boolean) {
    if (!addAnother) setDialogOpen(false);
    setNotice(`${t.food.saved} ${food.name}`);
    setQuery("");
    setView("CUSTOM");
  }

  const favoriteIds = useMemo(() => new Set(favorites.map((food) => food.id)), [favorites]);
  const favoriteMatches = useMemo(() => {
    const text = query.trim().toLowerCase();
    if (!text) return favorites;
    return favorites.filter((food) => `${food.name} ${food.brand ?? ""}`.toLowerCase().includes(text));
  }, [favorites, query]);

  const needsText = view === "COMMON" || view === "BRANDED";
  const typedEnough = !needsText || query.trim().length >= MIN_QUERY_LENGTH;
  const searchResults = onlineResults ?? localResults;

  let shownResults: FoodItem[];
  if (mode === "BARCODE") {
    shownResults = onlineResults ?? [];
  } else if (view === "FAVORITES") {
    shownResults = favoriteMatches;
  } else if (view === "BRANDED") {
    shownResults = searchResults.filter((food) => Boolean(food.brand));
  } else {
    shownResults = searchResults;
  }

  const emptyMessage =
    view === "FAVORITES"
      ? favorites.length === 0
        ? t.food.favoritesEmpty
        : t.food.noResults
      : view === "CUSTOM"
        ? t.food.customEmpty
        : t.food.noResults;

  const consumed = day?.totals.calories ?? 0;
  const topStat =
    day && targets ? `${consumed.toLocaleString()} / ${targets.calories.toLocaleString()} kcal` : undefined;

  return (
    <AppShell
      title={t.food.title}
      subtitle={t.food.subtitle}
      topStat={topStat}
      actions={
        <>
          <button
            type="button"
            onClick={() => changeMode("BARCODE")}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            {t.food.recentScans}
          </button>
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            {t.food.quickAdd}
          </button>
        </>
      }
    >
      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70 sm:p-6">
        <div className="flex flex-wrap gap-2">
          <ModeButton active={mode === "SEARCH"} onClick={() => changeMode("SEARCH")}>
            {t.food.modeSearch}
          </ModeButton>
          <ModeButton active={false} onClick={() => photoRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}>
            {t.food.modeAi}
          </ModeButton>
          <ModeButton active={mode === "BARCODE"} onClick={() => changeMode("BARCODE")}>
            {t.food.modeBarcode}
          </ModeButton>
        </div>

        {mode === "SEARCH" ? (
          <>
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-slate-300 px-4 py-2.5 focus-within:border-emerald-600 bg-white text-slate-900 [color-scheme:light]">
              <span aria-hidden="true" className="text-slate-400">
                &#x2315;
              </span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t.food.searchPlaceholder}
                aria-label={t.food.searchPlaceholder}
                className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 [color-scheme:light] focus:outline-none"
              />
              <kbd className="hidden rounded border border-slate-300 px-1.5 text-[10px] text-slate-500 sm:inline">
                {t.food.escHint}
              </kbd>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <Chip active={view === "COMMON"} onClick={() => setView("COMMON")}>
                {t.food.chipCommon}
              </Chip>
              <Chip active={view === "BRANDED"} onClick={() => setView("BRANDED")}>
                {t.food.chipBranded}
              </Chip>
              <Chip active={view === "CUSTOM"} onClick={() => setView("CUSTOM")}>
                {t.food.chipCustom}
              </Chip>
              <Chip active={view === "FAVORITES"} onClick={() => setView("FAVORITES")}>
                {t.food.chipFavorites}
              </Chip>
            </div>
          </>
        ) : (
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setScanning((current) => !current)}
              className="rounded-lg border border-emerald-700 px-3 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50"
            >
              {scanning ? t.food.stopScanning : t.food.scanWithCamera}
            </button>
            {scanning && (
              <div className="mt-4">
                <CameraScanner onDetected={(code) => void lookupBarcode(code)} onClose={() => setScanning(false)} />
              </div>
            )}
          <form onSubmit={handleBarcodeSubmit} className="mt-4 flex flex-wrap items-center gap-3">
            <input
              inputMode="numeric"
              value={barcodeText}
              onChange={(event) => setBarcodeText(event.target.value)}
              placeholder={t.food.barcodePlaceholder}
              aria-label={t.food.barcodePlaceholder}
              className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-emerald-600 focus:outline-none"
            />
            <button
              type="submit"
              disabled={onlineBusy || barcodeText.trim().length === 0}
              className="rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
            >
              {onlineBusy ? t.food.lookingUp : t.food.lookupBarcode}
            </button>
            <p className="w-full text-xs text-slate-500">{t.food.barcodeHint}</p>
          </form>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            {t.food.addTo}
            <select
              value={meal}
              onChange={(event) => setMeal(event.target.value as MealType)}
              className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm"
            >
              {MEAL_ORDER.map((mealType) => (
                <option key={mealType} value={mealType}>
                  {t.food.meals[mealType]}
                </option>
              ))}
            </select>
          </label>
          {mode === "SEARCH" && needsText && (
            <button
              type="button"
              onClick={searchOnline}
              disabled={query.trim().length < MIN_QUERY_LENGTH || onlineBusy}
              className="rounded-lg border border-emerald-700 px-3 py-1.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 disabled:opacity-50"
            >
              {onlineBusy ? t.food.searching : t.food.searchOnline}
            </button>
          )}
        </div>
        {mode === "SEARCH" && view === "COMMON" && <p className="mt-2 text-xs text-slate-500">{t.food.onlineHint}</p>}
        {mode === "SEARCH" && view === "BRANDED" && <p className="mt-2 text-xs text-slate-500">{t.food.brandedHint}</p>}

        {notice && <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
        {searchError && (
          <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {searchError}
          </p>
        )}
        {mode === "SEARCH" && !typedEnough && query.trim().length > 0 && (
          <p className="mt-4 text-sm text-slate-500">{t.food.minChars}</p>
        )}
        {searching && <p className="mt-4 text-sm text-slate-500">{t.common.loading}</p>}
        {mode === "SEARCH" && !searching && typedEnough && !searchError && shownResults.length === 0 && (
          <p className="mt-4 text-sm text-slate-500">{emptyMessage}</p>
        )}

        {shownResults.length > 0 && (
          <ul className="mt-4 divide-y divide-slate-200">
            {shownResults.map((food, index) => (
              <FoodRow
                key={food.id}
                food={food}
                isTopMatch={index === 0}
                mealLabel={t.food.meals[meal]}
                amount={amounts[food.id] ?? String(food.servingSize)}
                busy={busyId === food.id}
                isFavorite={favoriteIds.has(food.id)}
                onAmountChange={(value) => setAmounts((current) => ({ ...current, [food.id]: value }))}
                onAdd={() => addFood(food)}
                onToggleFavorite={() => toggleFavorite(food)}
                onDelete={food.source === "CUSTOM" ? () => deleteCustomFood(food) : undefined}
              />
            ))}
          </ul>
        )}
        {mode === "BARCODE" && onlineResults !== null && scannedBarcode && (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onlineResults && scannedBarcode && addToShopping(onlineResults[0], scannedBarcode)}
              disabled={addingToShopping}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-100 disabled:opacity-50"
            >
              {t.food.addToShopping}
            </button>
            {shoppingNotice && (
              <p role="status" className="text-sm text-emerald-700">
                {shoppingNotice}
              </p>
            )}
          </div>
        )}
        {mode === "BARCODE" && onlineResults === null && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold">{t.food.recentScansTitle}</h3>
            {recentScans.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">{t.food.recentScansEmpty}</p>
            ) : (
              <ul className="mt-2 divide-y divide-slate-200">
                {recentScans.map((food) => (
                  <FoodRow
                    key={food.id}
                    food={food}
                    isTopMatch={false}
                    mealLabel={t.food.meals[meal]}
                    amount={amounts[food.id] ?? String(food.servingSize)}
                    busy={busyId === food.id}
                    isFavorite={favoriteIds.has(food.id)}
                    onAmountChange={(value) => setAmounts((current) => ({ ...current, [food.id]: value }))}
                    onAdd={() => addFood(food)}
                    onToggleFavorite={() => toggleFavorite(food)}
                    onAddToShopping={food.barcode ? () => addToShopping(food, food.barcode ?? "") : undefined}
                  />
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      <div ref={photoRef}>
        <MealPhotoScan
          title={t.food.aiPanelTitle}
          mealType={meal}
          mealLabel={t.food.meals[meal]}
          date={today}
          onLogged={loadDay}
        />
      </div>

      {actionError && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {actionError}
        </p>
      )}
      {dayError && (
        <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
          {dayError}
        </p>
      )}

      {day && <IntakeTimeline day={day} targetCalories={targets?.calories ?? null} busyId={busyId} onRemove={removeEntry} />}

      {dialogOpen && (
        <QuickAddFoodDialog onClose={() => setDialogOpen(false)} onCreated={handleCustomFoodCreated} />
      )}
    </AppShell>
  );
}

type BarcodeDetectorLike = { detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]> };
type BarcodeDetectorConstructor = new (options: { formats: string[] }) => BarcodeDetectorLike;

/**
 * Reads a barcode from the camera with the browser's BarcodeDetector. Browsers without it (Firefox, for
 * example) show a message, and the barcode can still be typed.
 */
function CameraScanner({ onDetected, onClose }: { onDetected: (code: string) => void; onClose: () => void }) {
  const { t } = useI18n();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const onDetectedRef = useRef(onDetected);
  const [status, setStatus] = useState<"starting" | "scanning" | "denied" | "unsupported">("starting");

  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  useEffect(() => {
    const DetectorClass = (window as unknown as { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector;
    if (!DetectorClass || !navigator.mediaDevices?.getUserMedia) {
      setStatus("unsupported");
      return;
    }
    const detector = new DetectorClass({ formats: ["ean_13", "ean_8", "upc_a", "upc_e"] });
    let cancelled = false;
    let stream: MediaStream | null = null;
    let timer: number | null = null;

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" } })
      .then(async (media) => {
        if (cancelled) {
          media.getTracks().forEach((track) => track.stop());
          return;
        }
        stream = media;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = media;
        await video.play();
        setStatus("scanning");
        timer = window.setInterval(async () => {
          const frame = videoRef.current;
          if (!frame || cancelled) return;
          try {
            const [first] = await detector.detect(frame);
            if (first && first.rawValue && !cancelled) {
              cancelled = true;
              onDetectedRef.current(first.rawValue);
            }
          } catch {
            // A frame that cannot be read is skipped; the next frame is tried.
          }
        }, 400);
      })
      .catch(() => {
        if (!cancelled) setStatus("denied");
      });

    return () => {
      cancelled = true;
      if (timer !== null) window.clearInterval(timer);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  if (status === "unsupported") {
    return (
      <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
        <p>{t.food.cameraUnsupported}</p>
        <button type="button" onClick={onClose} className="mt-3 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-100">
          {t.food.stopScanning}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <video ref={videoRef} playsInline muted className="aspect-video w-full rounded-xl bg-slate-900 object-cover" />
      <p
        role={status === "denied" ? "alert" : undefined}
        className={`text-xs ${status === "denied" ? "text-red-700" : "text-slate-500"}`}
      >
        {status === "denied" ? t.food.cameraDenied : t.food.scanHint}
      </p>
      <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-100">
        {t.food.stopScanning}
      </button>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
        active ? "bg-emerald-700 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
      }`}
    >
      {children}
    </button>
  );
}

function ModeButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-lg px-4 py-2 text-sm font-semibold ${
        active ? "bg-emerald-700 text-white" : "border border-slate-200 text-slate-700 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}

function FoodRow({
  food,
  isTopMatch,
  mealLabel,
  amount,
  busy,
  isFavorite,
  onAmountChange,
  onAdd,
  onToggleFavorite,
  onDelete,
  onAddToShopping,
}: {
  food: FoodItem;
  isTopMatch: boolean;
  mealLabel: string;
  amount: string;
  busy: boolean;
  isFavorite: boolean;
  onAmountChange: (value: string) => void;
  onAdd: () => void;
  onToggleFavorite: () => void;
  onDelete?: () => void;
  onAddToShopping?: () => void;
}) {
  const { t } = useI18n();
  const origin = [food.brand, sourceLabel(food.source, t.food)].filter(Boolean).join(" · ");
  const addLabel = isTopMatch ? t.food.addToMeal.replace("{meal}", mealLabel) : t.food.add;

  return (
    <li className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-1 gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-sm font-bold text-emerald-800">
          {food.name.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold">{food.name}</p>
            <button
              type="button"
              onClick={onToggleFavorite}
              aria-pressed={isFavorite}
              aria-label={isFavorite ? t.food.unfavorite : t.food.favorite}
              title={isFavorite ? t.food.unfavorite : t.food.favorite}
              className="shrink-0 text-lg leading-none text-amber-500 hover:scale-110"
            >
              {isFavorite ? "★" : "☆"}
            </button>
            {onAddToShopping && (
              <button
                type="button"
                onClick={onAddToShopping}
                className="shrink-0 rounded border border-slate-300 px-2 py-0.5 text-xs font-medium hover:bg-slate-100"
              >
                {t.food.addToShopping}
              </button>
            )}
          </div>
          <p className="text-xs text-slate-500">
            {origin}
            {origin && " · "}
            {t.food.perPortion.replace("{amount}", String(food.servingSize)).replace("{unit}", food.servingUnit)}
          </p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded bg-rose-50 px-2 py-0.5 text-rose-700">P {food.proteinGrams} g</span>
            <span className="rounded bg-amber-50 px-2 py-0.5 text-amber-700">C {food.carbsGrams} g</span>
            <span className="rounded bg-teal-50 px-2 py-0.5 text-teal-700">F {food.fatGrams} g</span>
          </div>
          {!food.allergensKnown && <p className="mt-1 text-xs text-amber-700">{t.food.allergensUnknown}</p>}
          {food.allergensKnown && food.allergens.length > 0 && (
            <p className="mt-1 text-xs text-red-700">
              {t.food.allergensContain.replace("{list}", food.allergens.map(formatAllergen).join(", "))}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 sm:flex-col sm:items-end">
        <p className="text-xl font-bold">
          {food.calories} <span className="text-xs font-medium text-slate-500">kcal</span>
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            inputMode="decimal"
            value={amount}
            onChange={(event) => onAmountChange(event.target.value)}
            aria-label={t.food.amount}
            className="w-20 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
          />
          <span className="text-xs text-slate-500">{food.servingUnit}</span>
          <button
            type="button"
            onClick={onAdd}
            disabled={busy}
            className={`rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50 ${
              isTopMatch
                ? "bg-emerald-700 text-white hover:bg-emerald-800"
                : "border border-emerald-700 text-emerald-800 hover:bg-emerald-50"
            }`}
          >
            {addLabel}
          </button>
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              disabled={busy}
              className="rounded-lg border border-slate-300 px-2.5 py-2 text-xs font-medium hover:bg-slate-100 disabled:opacity-50"
            >
              {t.food.deleteFood}
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

function IntakeTimeline({
  day,
  targetCalories,
  busyId,
  onRemove,
}: {
  day: DayLog;
  targetCalories: number | null;
  busyId: string | null;
  onRemove: (id: string) => void;
}) {
  const { t } = useI18n();
  const totals = day.totals;
  const percent = targetCalories ? Math.min(100, Math.round((totals.calories / targetCalories) * 100)) : 0;

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">{t.food.intakeTitle}</h2>
          <p className="text-xs text-slate-500">{t.food.intakeSubtitle}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold">
            {totals.calories.toLocaleString()}
            {targetCalories !== null && <span className="font-medium text-slate-500"> / {targetCalories.toLocaleString()} kcal</span>}
            {targetCalories === null && <span className="font-medium text-slate-500"> kcal</span>}
          </p>
          <p className="text-xs text-slate-500">
            P {totals.proteinGrams} g · C {totals.carbsGrams} g · F {totals.fatGrams} g
          </p>
        </div>
      </div>
      {targetCalories !== null && (
        <div className="mt-3 h-2 rounded-full bg-slate-100" aria-hidden="true">
          <div className="h-2 rounded-full bg-emerald-600" style={{ width: `${percent}%` }} />
        </div>
      )}

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {MEAL_ORDER.map((mealType) => (
          <MealColumn
            key={mealType}
            title={t.food.meals[mealType]}
            entries={day.entries.filter((entry) => entry.mealType === mealType)}
            busyId={busyId}
            onRemove={onRemove}
          />
        ))}
      </div>
    </section>
  );
}

function MealColumn({
  title,
  entries,
  busyId,
  onRemove,
}: {
  title: string;
  entries: DayLog["entries"];
  busyId: string | null;
  onRemove: (id: string) => void;
}) {
  const { t } = useI18n();
  const kcal = entries.reduce((sum, entry) => sum + entry.calories, 0);
  const protein = Math.round(entries.reduce((sum, entry) => sum + entry.proteinGrams, 0) * 10) / 10;
  const logged = entries.length > 0;

  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
            logged ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-500"
          }`}
        >
          {logged ? t.food.logged : t.food.empty}
        </span>
      </div>
      <p className="mt-2 text-xl font-bold">
        {kcal} <span className="text-xs font-medium text-slate-500">kcal</span>
      </p>
      <p className="text-xs text-slate-500">P {protein} g</p>

      {!logged && <p className="mt-4 text-xs text-slate-500">{t.food.emptyMeal}</p>}
      <ul className="mt-3 divide-y divide-slate-100">
        {entries.map((entry) => (
          <li key={entry.id} className="flex items-center justify-between gap-2 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{entry.foodName}</p>
              <p className="text-xs text-slate-500">
                {entry.amount} {entry.servingUnit} · {entry.calories} kcal
              </p>
            </div>
            <button
              type="button"
              onClick={() => onRemove(entry.id)}
              disabled={busyId === entry.id}
              className="shrink-0 rounded-lg border border-slate-300 px-2 py-1 text-xs font-medium hover:bg-slate-100 disabled:opacity-50"
            >
              {t.food.remove}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
