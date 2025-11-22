"use client"

import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { CheckIcon, MinusIcon } from "lucide-react"

import { cn } from "@/lib/utils"

function Checkbox({
  className,
  checked,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  const isIndeterminate = checked === "indeterminate"
  const isChecked = checked === true

  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      checked={isIndeterminate ? false : checked}
      data-state={isIndeterminate ? "indeterminate" : isChecked ? "checked" : "unchecked"}
      className={cn(
        "peer border border-input dark:bg-input/30 data-[state=checked]:!bg-foreground data-[state=checked]:!text-background data-[state=indeterminate]:!bg-foreground data-[state=indeterminate]:!text-background data-[state=checked]:!border-0 data-[state=indeterminate]:!border-0 focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive size-4 shrink-0 rounded-[4px] shadow-xs transition-all outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      {isIndeterminate ? (
        <MinusIcon className="size-3.5" />
      ) : (
        <CheckboxPrimitive.Indicator
          data-slot="checkbox-indicator"
          className="grid place-content-center text-current transition-none"
        >
          <CheckIcon className="size-3.5" />
        </CheckboxPrimitive.Indicator>
      )}
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
