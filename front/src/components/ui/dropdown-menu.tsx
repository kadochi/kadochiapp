"use client";

import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ComponentRef,
} from "react";
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const DropdownMenu = DropdownMenuPrimitive.Root;
const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
const DropdownMenuGroup = DropdownMenuPrimitive.Group;

const DropdownMenuContent = forwardRef<
  ComponentRef<typeof DropdownMenuPrimitive.Content>,
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(function DropdownMenuContent({ className, sideOffset = 4, ...props }, ref) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        {...props}
        ref={ref}
        sideOffset={sideOffset}
        className={cn(
          "z-50 min-w-[10rem] overflow-hidden rounded-m border border-border-high-emphasis bg-surface-background p-4 shadow-[0_8px_24px_rgb(0_0_0_/_0.08)]",
          className,
        )}
      />
    </DropdownMenuPrimitive.Portal>
  );
});

const dropdownMenuItemVariants = cva(
  [
    "relative flex cursor-pointer select-none items-center gap-8 rounded-s px-8 py-8 font-sans text-label-16 outline-none",
    "[&>svg]:size-16 [&>svg]:shrink-0",
    "data-[disabled]:pointer-events-none data-[disabled]:cursor-not-allowed data-[disabled]:text-on-disable",
  ],
  {
    variants: {
      tone: {
        default:
          "text-surface-neutral-high-emphasis data-[highlighted]:bg-surface",
        danger: "text-error data-[highlighted]:bg-error-container",
      },
    },
    defaultVariants: {
      tone: "default",
    },
  },
);

const DropdownMenuItem = forwardRef<
  ComponentRef<typeof DropdownMenuPrimitive.Item>,
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> &
    VariantProps<typeof dropdownMenuItemVariants>
>(function DropdownMenuItem({ className, tone, ...props }, ref) {
  return (
    <DropdownMenuPrimitive.Item
      {...props}
      ref={ref}
      className={cn(dropdownMenuItemVariants({ tone }), className)}
    />
  );
});

const DropdownMenuSeparator = forwardRef<
  ComponentRef<typeof DropdownMenuPrimitive.Separator>,
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(function DropdownMenuSeparator({ className, ...props }, ref) {
  return (
    <DropdownMenuPrimitive.Separator
      {...props}
      ref={ref}
      className={cn("-mx-4 my-4 h-px bg-border-low-emphasis", className)}
    />
  );
});

const DropdownMenuLabel = forwardRef<
  ComponentRef<typeof DropdownMenuPrimitive.Label>,
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label>
>(function DropdownMenuLabel({ className, ...props }, ref) {
  return (
    <DropdownMenuPrimitive.Label
      {...props}
      ref={ref}
      className={cn(
        "px-8 py-4 font-sans text-label-12 font-regular text-surface-neutral-mid-emphasis",
        className,
      )}
    />
  );
});

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  dropdownMenuItemVariants,
};
