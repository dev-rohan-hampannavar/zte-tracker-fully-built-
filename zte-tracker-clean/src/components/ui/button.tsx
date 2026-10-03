import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Premium-SaaS button language: rounded-lg now resolves to the 14px radius
// token (see globals.css --radius), active states use a slight scale-press
// instead of just opacity so clicks feel tactile, and transition-standard
// covers color+transform+shadow in one consistent easing curve.
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-standard active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 disabled:active:scale-100 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-accent text-accent-foreground shadow-sm shadow-accent/20 hover:opacity-90 hover:shadow-[0_0_20px_rgb(var(--accent-glow)/0.5)] active:opacity-80",
        secondary:
          "bg-surface-2 text-foreground border border-border hover:bg-surface-hover",
        outline:
          "border border-border bg-transparent hover:bg-surface-2 hover:border-muted-2 text-foreground",
        ghost: "hover:bg-surface-2 text-foreground",
        destructive: "bg-danger text-white shadow-sm shadow-danger/20 hover:opacity-90",
        link: "text-accent underline-offset-4 hover:underline active:scale-100",
      },
      size: {
        default: "h-9 px-4 py-2 [&_svg]:size-4",
        sm: "h-8 rounded-md px-3 text-xs [&_svg]:size-3.5",
        lg: "h-11 px-6 text-[15px] [&_svg]:size-4",
        icon: "h-9 w-9 rounded-full [&_svg]:size-4",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
