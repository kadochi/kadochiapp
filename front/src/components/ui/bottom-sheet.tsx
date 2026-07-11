"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { cva, type VariantProps } from "class-variance-authority";
import clsx from "clsx";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

const bottomSheetOverlayVariants = cva(
  "fixed inset-0 z-50 bg-surface-scrim",
);

const bottomSheetContentVariants = cva(
  [
    "fixed inset-x-0 bottom-0 z-50 mx-auto flex w-full max-h-[calc(100svh-4rem)] flex-col overflow-hidden",
    "rounded-t-xl bg-surface-background text-text-primary shadow-[0_-8px_24px_rgb(0_0_0_/_0.08)] outline-none",
  ],
  {
    variants: {
      size: {
        sm: "max-w-[30rem]",
        md: "max-w-[40rem]",
        lg: "max-w-[56rem]",
      },
    },
    defaultVariants: {
      size: "md",
    },
  },
);

type BottomSheetProps = ComponentPropsWithoutRef<typeof Dialog.Root>;

type BottomSheetContentProps = ComponentPropsWithoutRef<typeof Dialog.Content> &
  VariantProps<typeof bottomSheetContentVariants> & {
    /** Shows the visual drag affordance above the scrollable content. */
    showHandle?: boolean;
  };

function BottomSheet(props: BottomSheetProps) {
  return <Dialog.Root {...props} />;
}

function BottomSheetTrigger(
  props: ComponentPropsWithoutRef<typeof Dialog.Trigger>,
) {
  return <Dialog.Trigger {...props} />;
}

function BottomSheetClose(props: ComponentPropsWithoutRef<typeof Dialog.Close>) {
  return <Dialog.Close {...props} />;
}

function BottomSheetContent({
  children,
  className,
  showHandle = true,
  size,
  ...props
}: BottomSheetContentProps) {
  return (
    <Dialog.Portal>
      <Dialog.Overlay className={bottomSheetOverlayVariants()} />
      <Dialog.Content
        {...props}
        className={clsx(bottomSheetContentVariants({ size }), className)}
      >
        {showHandle ? (
          <div aria-hidden="true" className="flex justify-center pb-16 pt-8">
            <span className="h-6 w-128 rounded-rounded bg-border-mid-emphasis" />
          </div>
        ) : null}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[max(env(safe-area-inset-bottom),1rem)]">
          {children}
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  );
}

function BottomSheetTitle(
  props: ComponentPropsWithoutRef<typeof Dialog.Title>,
) {
  return <Dialog.Title {...props} />;
}

function BottomSheetDescription(
  props: ComponentPropsWithoutRef<typeof Dialog.Description>,
) {
  return <Dialog.Description {...props} />;
}

function BottomSheetHeader({
  children,
  className,
  ...props
}: ComponentPropsWithoutRef<"div"> & { children: ReactNode }) {
  return (
    <div
      {...props}
      className={clsx("flex flex-col gap-4 px-20 pb-16 text-start", className)}
    >
      {children}
    </div>
  );
}

export {
  BottomSheet,
  BottomSheetClose,
  BottomSheetContent,
  BottomSheetDescription,
  BottomSheetHeader,
  BottomSheetTitle,
  BottomSheetTrigger,
  bottomSheetContentVariants,
  bottomSheetOverlayVariants,
};
export type { BottomSheetContentProps, BottomSheetProps };
export default BottomSheet;
