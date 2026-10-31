import { Link } from "react-router-dom";

export function BrandMark() {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <img src="/logo.svg" alt="" width={36} height={36} className="h-9 w-9" />
      <span className="leading-tight">
        <span className="block text-base font-bold text-slate-900">NutriDay</span>
        <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-[#00613f]">Nutrition</span>
      </span>
    </Link>
  );
}
