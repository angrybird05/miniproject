import { cn } from "@/utils/cn";

const styles = {
  sky: "bg-sky-100 text-sky-700",
  emerald: "bg-emerald-100 text-emerald-700",
  amber: "bg-amber-100 text-amber-700",
  rose: "bg-rose-100 text-rose-700",
  slate: "bg-slate-100 text-slate-700"
};

export function Badge({ className, tone = "slate", ...props }) {
  return (
    <span
      className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", styles[tone], className)}
      {...props}
    />
  );
}
