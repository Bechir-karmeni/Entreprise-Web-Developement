import { Link } from "react-router-dom";
import { DropIcon } from "./icons";

export function BrandMark() {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#00613f] text-white">
        <DropIcon className="h-5 w-5" />
      </span>
      <span className="leading-tight">
        <span className="block text-base font-bold text-slate-900">Daily Tracker</span>
        <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-[#00613f]">Nutrition</span>
      </span>
    </Link>
  );
}
