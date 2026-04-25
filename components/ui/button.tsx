import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button relative inline-flex shrink-0 items-center justify-center rounded-xl font-medium whitespace-nowrap transition-all duration-200 ease-out outline-none select-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        // Primary — signature gradient with accent shadow
        default:
          "bg-gradient-to-r from-[#0052FF] to-[#4D7CFF] text-white shadow-[0_4px_14px_rgba(0,82,255,0.25)] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,82,255,0.40)] hover:brightness-110",
        // Outline — muted bg → accent on hover
        outline:
          "border border-[var(--color-b2)] bg-white text-foreground hover:border-[var(--color-accent-a30)] hover:bg-[var(--color-accent-a05)] hover:text-[var(--color-accent)] hover:shadow-[0_2px_8px_rgba(15,23,42,0.06)]",
        // Secondary — neutral surface
        secondary:
          "bg-[var(--color-surface-2)] text-foreground hover:bg-[var(--color-surface-3)]",
        // Ghost — text only, hover surface
        ghost:
          "text-[var(--color-t2)] hover:bg-[var(--color-surface-2)] hover:text-foreground",
        // Destructive
        destructive:
          "bg-[var(--color-red-bg)] text-[var(--color-red)] hover:bg-[rgba(239,68,68,0.18)]",
        // Inverted — for dark backgrounds
        inverted:
          "bg-white text-[var(--color-t1)] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(255,255,255,0.20)]",
        // Link
        link: "h-auto p-0 text-[var(--color-accent)] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-5 text-sm gap-2",
        xs: "h-7 px-2.5 text-xs gap-1 rounded-lg",
        sm: "h-9 px-3.5 text-[13px] gap-1.5 rounded-lg",
        lg: "h-12 px-6 text-[15px] gap-2 rounded-xl",
        xl: "h-14 px-7 text-[15px] gap-2.5 rounded-xl",
        icon: "size-10 rounded-xl",
        "icon-sm": "size-9 rounded-lg",
        "icon-lg": "size-12 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
