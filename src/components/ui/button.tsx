import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium tracking-tight transition-[background-color,color,border-color,transform] duration-200 ease-out disabled:pointer-events-none disabled:opacity-50 select-none active:scale-[0.985] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-foreground text-background hover:bg-foreground/90",
        accent:
          "bg-accent text-background hover:bg-accent/90 shadow-[0_1px_0_0_color-mix(in_oklch,var(--accent-ink)_30%,transparent)]",
        outline:
          "border border-border-strong bg-surface text-foreground hover:bg-subtle",
        ghost:
          "text-foreground hover:bg-subtle",
        subtle:
          "bg-subtle text-foreground hover:bg-border",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-4",
        lg: "h-12 px-6 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
);
Button.displayName = "Button";

export { buttonVariants };
