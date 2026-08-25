import { AlertCircle, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

type StatusPanelProps = {
  title: string;
  message: string;
  variant?: "default" | "error";
  className?: string;
};

export function StatusPanel({ title, message, variant = "default", className }: StatusPanelProps) {
  const Icon = variant === "error" ? AlertCircle : Loader2;
  return (
    <div
      className={cn(
        "rounded-[8px] border border-border bg-stone-50 p-5 text-sm text-muted",
        variant === "error" && "border-red-200 bg-red-50 text-red-700",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", variant === "default" && "animate-spin text-accent")} />
        <div>
          <p className="font-bold text-foreground">{title}</p>
          <p className="mt-1 leading-6">{message}</p>
        </div>
      </div>
    </div>
  );
}
