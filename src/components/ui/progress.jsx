import { cn } from "@/utils/cn";

export function Progress({ value, className }) {
  return (
    <div className={cn("h-2.5 w-full overflow-hidden rounded-full bg-slate-100", className)}>
      <div
        className="h-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-400 transition-all"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}
