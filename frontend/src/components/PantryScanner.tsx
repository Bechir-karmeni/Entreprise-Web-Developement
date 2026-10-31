import { useEffect, useState, type ChangeEvent } from "react";
import { detectFoods } from "../lib/fridgeVision";
import { fridgeApi } from "../api/recommendationApi";
import { useI18n } from "../i18n/useI18n";

const MAX_SIDE = 1024;
const JPEG_QUALITY = 0.8;
const FIELD = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 [color-scheme:light]";

interface Detected {
  name: string;
  checked: boolean;
}

interface Notice {
  tone: "ok" | "error";
  text: string;
}

/** Shrinks the photo in the browser, so the model works on a small image. */
async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("no canvas");
  }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("encode"))), "image/jpeg", JPEG_QUALITY),
  );
}

export default function PantryScanner() {
  const { t } = useI18n();
  const p = t.pantry;
  const [preview, setPreview] = useState<string | null>(null);
  const [detected, setDetected] = useState<Detected[]>([]);
  const [scanning, setScanning] = useState(false);
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  async function onPick(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setNotice(null);
    setDetected([]);
    try {
      const small = await shrink(file);
      setPreview(URL.createObjectURL(small));
    } catch {
      setPreview(null);
      setNotice({ tone: "error", text: p.unreadable });
    }
  }

  async function scan() {
    if (!preview) return;
    setScanning(true);
    setNotice(null);
    try {
      const items = await detectFoods(preview);
      setDetected(items.map((name) => ({ name, checked: true })));
      if (items.length === 0) setNotice({ tone: "ok", text: p.nothingFound });
    } catch {
      setNotice({ tone: "error", text: p.modelFailed });
    } finally {
      setScanning(false);
    }
  }

  async function addChecked() {
    const names = detected.filter((item) => item.checked && item.name.trim()).map((item) => item.name.trim());
    if (names.length === 0) return;
    setAdding(true);
    setNotice(null);
    let added = 0;
    try {
      for (const name of names) {
        await fridgeApi.add(name);
        added++;
      }
      setNotice({ tone: "ok", text: p.added.replace("{count}", String(added)) });
      setDetected([]);
      setPreview(null);
    } catch {
      setNotice({ tone: "error", text: `${t.common.genericError} ${p.addFailed.replace("{count}", String(added))}` });
    } finally {
      setAdding(false);
    }
  }

  function update(index: number, change: Partial<Detected>) {
    setDetected((current) => current.map((item, i) => (i === index ? { ...item, ...change } : item)));
  }

  const checkedCount = detected.filter((item) => item.checked && item.name.trim()).length;

  return (
    <section className="mb-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
      <h2 className="font-semibold">{p.title}</h2>
      <p className="mt-1 text-sm text-slate-500">{p.text}</p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          aria-label={p.choose}
          onChange={onPick}
          className="text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-emerald-800 hover:file:bg-emerald-100"
        />
        <button
          type="button"
          onClick={scan}
          disabled={!preview || scanning}
          className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
        >
          {scanning ? p.scanning : p.scan}
        </button>
      </div>
      <p className="mt-2 text-xs text-slate-500">{p.privacy}</p>
      {scanning && <p className="mt-2 text-xs text-slate-500">{p.firstRun}</p>}

      {preview && <img src={preview} alt="" className="mt-4 max-h-60 rounded-lg object-contain" />}

      {notice && (
        <p
          role={notice.tone === "error" ? "alert" : "status"}
          className={`mt-3 rounded-lg p-3 text-sm ${notice.tone === "error" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-800"}`}
        >
          {notice.text}
        </p>
      )}

      {detected.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-semibold">{p.detected}</p>
          <ul className="mt-2 space-y-2">
            {detected.map((item, index) => (
              <li key={index} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={item.checked}
                  aria-label={item.name}
                  onChange={(event) => update(index, { checked: event.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-700"
                />
                <input
                  type="text"
                  value={item.name}
                  maxLength={100}
                  onChange={(event) => update(index, { name: event.target.value })}
                  className={FIELD}
                />
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={addChecked}
            disabled={adding || checkedCount === 0}
            className="mt-4 rounded-lg border border-emerald-700 px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 disabled:opacity-50"
          >
            {adding ? p.adding : p.add}
          </button>
        </div>
      )}
    </section>
  );
}
