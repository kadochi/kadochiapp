"use client";

import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ComponentRef,
} from "react";
import { Toast as ToastPrimitive } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";
import { X } from "lucide-react";
import { alertVariants } from "./alert";

const ToastProvider = ToastPrimitive.Provider;

const ToastViewport = forwardRef<
  ComponentRef<typeof ToastPrimitive.Viewport>,
  ComponentPropsWithoutRef<typeof ToastPrimitive.Viewport>
>(function ToastViewport({ className, ...props }, ref) {
  return (
    <ToastPrimitive.Viewport
      {...props}
      ref={ref}
      className={cn(
        "fixed bottom-0 start-0 z-[60] m-0 flex w-full max-w-[24rem] list-none flex-col gap-8 p-16 outline-none",
        className,
      )}
    />
  );
});

const toastVariants = cva(
  [
    "relative",
    "data-[state=open]:animate-toast-in data-[state=closed]:animate-toast-out",
    "data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none",
    "data-[swipe=cancel]:translate-x-0 data-[swipe=cancel]:transition-transform",
    "data-[swipe=end]:animate-toast-swipe-out",
  ],
  {
    variants: {
      tone: {
        info: "",
        success: "",
        warning: "",
        error: "",
      },
    },
    defaultVariants: {
      tone: "info",
    },
  },
);

type ToastProps = ComponentPropsWithoutRef<typeof ToastPrimitive.Root> &
  VariantProps<typeof toastVariants>;

const Toast = forwardRef<ComponentRef<typeof ToastPrimitive.Root>, ToastProps>(
  function Toast({ className, tone, ...props }, ref) {
    return (
      <ToastPrimitive.Root
        {...props}
        ref={ref}
        className={cn(
          alertVariants({ tone }),
          toastVariants({ tone }),
          className,
        )}
      />
    );
  },
);

const ToastTitle = forwardRef<
  ComponentRef<typeof ToastPrimitive.Title>,
  ComponentPropsWithoutRef<typeof ToastPrimitive.Title>
>(function ToastTitle({ className, ...props }, ref) {
  return (
    <ToastPrimitive.Title
      {...props}
      ref={ref}
      className={cn("text-label-16 font-bold leading-normal", className)}
    />
  );
});

const ToastDescription = forwardRef<
  ComponentRef<typeof ToastPrimitive.Description>,
  ComponentPropsWithoutRef<typeof ToastPrimitive.Description>
>(function ToastDescription({ className, ...props }, ref) {
  return (
    <ToastPrimitive.Description
      {...props}
      ref={ref}
      className={cn(
        "mt-2 text-label-14 font-regular leading-normal",
        className,
      )}
    />
  );
});

const ToastClose = forwardRef<
  ComponentRef<typeof ToastPrimitive.Close>,
  ComponentPropsWithoutRef<typeof ToastPrimitive.Close>
>(function ToastClose(
  { className, "aria-label": ariaLabel = "Dismiss", ...props },
  ref,
) {
  return (
    <ToastPrimitive.Close
      {...props}
      ref={ref}
      aria-label={ariaLabel}
      className={cn(
        "-me-2 -mt-2 inline-flex size-24 shrink-0 items-center justify-center rounded-full text-current transition-colors hover:bg-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current",
        className,
      )}
    >
      <X aria-hidden="true" className="size-16" />
    </ToastPrimitive.Close>
  );
});

const ToastAction = forwardRef<
  ComponentRef<typeof ToastPrimitive.Action>,
  ComponentPropsWithoutRef<typeof ToastPrimitive.Action>
>(function ToastAction({ className, ...props }, ref) {
  return (
    <ToastPrimitive.Action
      {...props}
      ref={ref}
      className={cn(
        "shrink-0 self-center text-label-14 font-bold underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current",
        className,
      )}
    />
  );
});

export {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
  toastVariants,
};
export type { ToastProps };
