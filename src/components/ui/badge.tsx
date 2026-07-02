import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-050 overflow-hidden rounded-xs border border-transparent px-050 text-body-small font-weight-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:border-border-focused focus-visible:ring-[3px] focus-visible:ring-border-focused/50 aria-invalid:border-border-danger aria-invalid:ring-border-danger/20 [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        default: "bg-neutral text-text [a&]:hover:bg-neutral-hovered",
        primary: "bg-brand-subtlest text-text-brand [a&]:hover:bg-brand-subtlest-hovered",
        success: "bg-success-subtler text-text-success-bolder [a&]:hover:bg-success-hovered",
        warning: "bg-warning-subtler text-text-warning-bolder [a&]:hover:bg-warning-hovered",
        danger: "bg-danger-subtler text-text-danger-bolder [a&]:hover:bg-danger-hovered",
        information: "bg-information-subtler text-text-information-bolder [a&]:hover:bg-information-hovered",
        discovery: "bg-discovery-subtler text-text-discovery-bolder [a&]:hover:bg-discovery-hovered",
        outline: "border-border text-text [a&]:hover:bg-neutral [a&]:hover:text-text",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
