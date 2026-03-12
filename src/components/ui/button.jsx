import { forwardRef } from "react";
import { cn } from "@/utils/cn";

const variants = {
  default: "bg-sky-500 text-white hover:bg-sky-600",
  secondary: "bg-slate-900 text-white hover:bg-slate-800",
  outline: "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
  ghost: "text-slate-600 hover:bg-slate-100"
};

export const Button = forwardRef(function Button(
  { className, variant = "default", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-sky-300 disabled:pointer-events-none disabled:opacity-50",
        "shadow-sm hover:-translate-y-0.5",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
});
