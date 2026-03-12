import { cn } from "@/utils/cn";

export default function Spinner({ className, size = "md", label = "Loading..." }) {
  const sizeClasses = {
    sm: "h-4 w-4 border-2",
    md: "h-6 w-6 border-[3px]",
    lg: "h-10 w-10 border-4",
  };

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        className={cn(
          "animate-spin rounded-full border-slate-200 border-t-sky-500",
          sizeClasses[size] || sizeClasses.md,
        )}
      />
      {label ? <span className="text-sm text-slate-500">{label}</span> : null}
    </div>
  );
}
