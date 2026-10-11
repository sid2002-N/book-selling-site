import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { Spinner } from "./Spinner";

export const buttonVariants = cva(
  [
    "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium",
    "transition-[background-color,box-shadow,color,transform] duration-fast ease-out-soft",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
    "active:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-busy:cursor-progress",
    "[&_svg]:size-4 [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        primary: "bg-ink text-fg-on-ink hover:bg-ink-hover hover:shadow-1",
        secondary: "border border-line-strong bg-surface text-fg hover:bg-surface-raised hover:shadow-1",
        tertiary: "text-fg underline-offset-4 hover:underline",
        ghost: "text-fg-secondary hover:bg-canvas-subtle hover:text-fg",
        accent: "bg-accent text-ink hover:bg-accent-strong hover:text-fg-on-ink",
        destructive: "bg-error text-white hover:opacity-90",
        "destructive-outline": "border border-error/40 bg-surface text-error hover:bg-error-soft",
      },
      size: {
        sm: "h-9 px-3 text-body-sm",
        md: "h-11 px-5 text-body-sm",
        lg: "h-12 px-6 text-body",
        icon: "size-10 touch:size-11",
        "icon-sm": "size-8",
      },
      block: { true: "w-full" },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export type ButtonProps = ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    loading?: boolean;
  };

export function Button({
  className,
  variant,
  size,
  block,
  asChild = false,
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, block }), className)}
      disabled={asChild ? undefined : disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && !asChild ? (
        <>
          <Spinner className="size-4" />
          <span className="sr-only">Loading</span>
          <span aria-hidden className="contents">
            {children}
          </span>
        </>
      ) : (
        children
      )}
    </Comp>
  );
}
