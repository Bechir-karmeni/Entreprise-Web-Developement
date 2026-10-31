import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { ApiError } from "../api/http";
import { foodApi } from "../api/foodApi";
import { foodPhotoApi } from "../api/foodPhotoApi";
import { notifyFoodLogChanged } from "../lib/foodEvents";
import { useI18n } from "../i18n/useI18n";
import type { MealType } from "../types/food";
import type { FoodPhotoItem } from "../types/foodPhoto";

const MAX_SIDE = 1280;

interface Candidate extends FoodPhotoItem {
  keep: boolean;
}

interface Props {
  title: string;
  mealType: MealType;
  mealLabel: string;
  date: string;
  onLogged: () => void;
}

/** Shrinks the photo to a JPEG of at most 1280 pixels on its longest side. Keeps the upload small and quick. */
function prepareImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const scale = Math.min(1, MAX_SIDE / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext("2d");
      URL.revokeObjectURL(url);
      if (!context) {
        reject(new Error("no canvas"));
        return;
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const data = canvas.toDataURL("image/jpeg", 0.85);
      resolve(data.slice(data.indexOf(",") + 1));
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("unreadable"));
    };
    image.src = url;
  });
}

/** Photo of a meal: Gemini finds the foods and estimates their nutrition, and the user chooses what to log. */
export function MealPhotoScan({ title, mealType, mealLabel, date, onLogged }: Props) {
  const { t, language } = useI18n();
  const p = t.food;
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [items, setItems] = useState<Candidate[] | null>(null);
  const [busy, setBusy] = useState<"analyse" | "add" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function onPick(event: ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0];
    event.target.value = "";
    if (!picked) return;
    setError(null);
    setNotice(null);
    setItems(null);
    if (!picked.type.startsWith("image/")) {
      setFile(null);
      setError(p.photoType);
      return;
    }
    setFile(picked);
    setPreview(URL.createObjectURL(picked));
  }

  async function analyse() {
    if (!file) return;
    setBusy("analyse");
    setError(null);
    setNotice(null);
    try {
      const imageBase64 = await prepareImage(file);
      const found = await foodPhotoApi.analyse({ imageBase64, mimeType: "image/jpeg", language });
      setItems(found.map((item) => ({ ...item, keep: true })));
      if (found.length === 0) setNotice(p.photoNothing);
    } catch (failure) {
      setError(failure instanceof ApiError ? failure.message : t.common.genericError);
    } finally {
      setBusy(null);
    }
  }

  async function addSelected() {
    const chosen = (items ?? []).filter((item) => item.keep);
    if (chosen.length === 0) return;
    setBusy("add");
    setError(null);
    try {
      for (const item of chosen) {
        await foodApi.addQuickEntry({
          mealType,
          date,
          name: item.name,
          calories: Math.round(item.calories),
          proteinGrams: item.proteinGrams,
          carbsGrams: item.carbsGrams,
          fatGrams: item.fatGrams,
          fiberGrams: item.fiberGrams,
        });
      }
      notifyFoodLogChanged();
      onLogged();
      setNotice(p.photoAdded.replace("{count}", String(chosen.length)).replace("{meal}", mealLabel));
      setItems(null);
      setFile(null);
      setPreview(null);
    } catch (failure) {
      setError(failure instanceof ApiError ? failure.message : t.common.genericError);
    } finally {
      setBusy(null);
    }
  }

  function toggle(index: number) {
    setItems((current) =>
      current ? current.map((item, position) => (position === index ? { ...item, keep: !item.keep } : item)) : current,
    );
  }

  const chosenCount = items?.filter((item) => item.keep).length ?? 0;

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold">{title}</h2>
        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium uppercase text-emerald-800">{p.photoBadge}</span>
      </div>
      <p className="mt-1 text-sm text-slate-500">{p.photoIntro.replace("{meal}", mealLabel)}</p>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        onChange={onPick}
        className="hidden"
        aria-label={p.photoChoose}
      />

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy !== null}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-100 disabled:opacity-50"
        >
          {file ? p.photoChangeFile : p.photoChoose}
        </button>
        {file && (
          <button
            type="button"
            onClick={analyse}
            disabled={busy !== null}
            className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            {busy === "analyse" ? p.photoBusy : p.photoAnalyse}
          </button>
        )}
      </div>

      {preview && (
        <img src={preview} alt="" className="mt-4 max-h-64 w-auto rounded-xl object-contain ring-1 ring-slate-200" />
      )}

      {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}

      {items && items.length > 0 && (
        <div className="mt-5">
          <h3 className="text-sm font-semibold">{p.photoDetected}</h3>
          <p className="mt-1 text-xs text-slate-500">{p.photoHint}</p>
          <ul className="mt-3 divide-y divide-slate-100">
            {items.map((item, index) => (
              <li key={`${item.name}-${index}`} className="flex items-start gap-3 py-3">
                <input
                  type="checkbox"
                  checked={item.keep}
                  onChange={() => toggle(index)}
                  className="mt-1 h-4 w-4 accent-emerald-700"
                  aria-label={item.name}
                />
                <div className="min-w-0 flex-1 text-sm">
                  <p className="font-medium text-slate-800">
                    {item.name} <span className="font-normal text-slate-500">· {Math.round(item.grams)} g</span>
                  </p>
                  <p className="text-xs text-slate-500">
                    {p.photoMacros
                      .replace("{kcal}", String(Math.round(item.calories)))
                      .replace("{protein}", item.proteinGrams.toFixed(1))
                      .replace("{carbs}", item.carbsGrams.toFixed(1))
                      .replace("{fat}", item.fatGrams.toFixed(1))}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={addSelected}
            disabled={busy !== null || chosenCount === 0}
            className="mt-3 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            {busy === "add" ? p.photoAdding : p.photoAddSelected.replace("{count}", String(chosenCount)).replace("{meal}", mealLabel)}
          </button>
        </div>
      )}

      <p className="mt-5 text-xs text-slate-500">{p.photoDisclaimer}</p>
    </section>
  );
}
