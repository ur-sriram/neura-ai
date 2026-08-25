import * as React from "react";

import { cn } from "@/lib/utils";

export function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[6px] border border-border bg-stone-50 px-2 py-1 text-xs font-semibold text-muted",
        className
      )}
      {...props}
    />
  );
}
