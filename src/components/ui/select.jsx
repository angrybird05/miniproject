import { cn } from "@/utils/cn";

export function Select({ className, children, ...props }) {
  return (
    <select
      className={cn(
        "flex h-11 w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-300",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
