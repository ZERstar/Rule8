import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-[22px] border border-input bg-white/74 px-4 py-3 text-base shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:bg-white focus-visible:ring-3 focus-visible:ring-ring/36 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
