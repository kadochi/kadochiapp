"use client";

import { Dialog } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";
import { useRef, useState } from "react";
import type { ComponentPropsWithoutRef, PointerEvent as ReactPointerEvent, ReactNode } from "react";

const DISMISS_DISTANCE = 120;
const DISMISS_VELOCITY = 600;

const bottomSheetOverlayVariants = cva(
  "fixed inset-0 z-[1100] bg-surface-scrim",
);

const bottomSheetContentVariants = cva(
  [
    "fixed inset-x-0 bottom-0 z-[1100] mx-auto flex w-full max-h-[calc(100svh-4rem)] flex-col overflow-hidden",
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
    /** Keeps sheet actions visible while the body scrolls. */
    footer?: ReactNode;
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
  footer,
  showHandle = true,
  size,
  style,
  ...props
}: BottomSheetContentProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const dragStart = useRef<{ pointerId: number; time: number; y: number } | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStart.current = {
      pointerId: event.pointerId,
      time: Date.now(),
      y: event.clientY,
    };
    setIsDragging(true);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragStart.current || dragStart.current.pointerId !== event.pointerId) return;
    setDragOffset(Math.max(0, event.clientY - dragStart.current.y));
  };

  const handlePointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = dragStart.current;
    if (!start || start.pointerId !== event.pointerId) return;

    const offset = Math.max(0, event.clientY - start.y);
    const velocity = (offset / Math.max(Date.now() - start.time, 1)) * 1000;
    dragStart.current = null;
    setIsDragging(false);

    if (offset >= DISMISS_DISTANCE || velocity >= DISMISS_VELOCITY) {
      closeRef.current?.click();
      return;
    }

    setDragOffset(0);
  };

  return (
    <Dialog.Portal>
      <Dialog.Overlay className={bottomSheetOverlayVariants()} />
      <Dialog.Content {...props} asChild>
        <div
          className={cn(bottomSheetContentVariants({ size }), className)}
          style={{
            ...style,
            transform: `translateY(${dragOffset}px)`,
            transition: isDragging ? "none" : "transform 200ms ease-out",
          }}
        >
          <Dialog.Close
            aria-hidden="true"
            className="hidden"
            ref={closeRef}
            tabIndex={-1}
          >
            Close sheet
          </Dialog.Close>
          {showHandle ? (
            <div
              aria-hidden="true"
              className="flex touch-none cursor-grab justify-center pb-16 pt-8 active:cursor-grabbing"
              onPointerCancel={handlePointerEnd}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerEnd}
            >
              <span className="h-6 w-128 rounded-rounded bg-border-mid-emphasis" />
            </div>
          ) : null}
          <div
            className={cn(
              "min-h-0 flex-1 overflow-y-auto overscroll-contain",
              footer ? "pb-0" : "pb-[max(env(safe-area-inset-bottom),1rem)]",
            )}
          >
            {children}
          </div>
          {footer}
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
      className={cn("flex flex-col gap-4 px-20 pb-16 text-start", className)}
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
