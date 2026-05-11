import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-xl border border-transparent bg-clip-padding font-semibold whitespace-nowrap transition-all duration-200 outline-none select-none cursor-pointer focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-md shadow-primary/25 hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5",
        outline:
          "border-2 border-primary/30 bg-background text-primary hover:bg-primary/5 hover:border-primary/60",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/85 hover:-translate-y-0.5",
        ghost:
          "hover:bg-muted hover:text-foreground",
        destructive:
          "bg-destructive text-white shadow-sm hover:bg-destructive/90",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 gap-2 px-4 text-sm",
        xs:      "h-7 gap-1 rounded-lg px-2.5 text-xs",
        sm:      "h-9 gap-1.5 px-3 text-sm",
        lg:      "h-12 gap-2 px-6 text-base",
        icon:    "size-10",
        "icon-xs": "size-7 rounded-lg",
        "icon-sm": "size-9",
        "icon-lg": "size-12",
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
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
