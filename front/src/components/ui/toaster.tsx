"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  CircleAlert,
  CircleCheck,
  Info,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "./toast";
import type { AlertTone } from "./alert";

const toneIcons: Record<AlertTone, LucideIcon> = {
  info: Info,
  success: CircleCheck,
  warning: TriangleAlert,
  error: CircleAlert,
};

type ToastOptions = {
  /** Visual tone; controls colours and the default icon. */
  tone?: AlertTone;
  /** Prominent heading. */
  title?: ReactNode;
  /** Supporting content. */
  description?: ReactNode;
  /** Auto-dismiss delay in ms. */
  duration?: number;
};

type ToastEntry = ToastOptions & { id: number; open: boolean };

type ToastContextValue = {
  toast: (options: ToastOptions) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

/** Returns `toast()` to enqueue a notification. Must be under `<Toaster>`. */
function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within <Toaster>.");
  }

  return context;
}

function Toaster({ children }: { children?: ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const idRef = useRef(0);

  const toast = useCallback((options: ToastOptions) => {
    const id = (idRef.current += 1);
    setToasts((current) => [...current, { ...options, id, open: true }]);
  }, []);

  const handleOpenChange = useCallback((id: number, open: boolean) => {
    if (open) return;
    // Mark closed so the exit animation runs, then drop it from the list.
    setToasts((current) =>
      current.map((entry) =>
        entry.id === id ? { ...entry, open: false } : entry,
      ),
    );
    window.setTimeout(() => {
      setToasts((current) => current.filter((entry) => entry.id !== id));
    }, 200);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastProvider swipeDirection="right">
        {toasts.map((entry) => {
          const tone = entry.tone ?? "info";
          const Icon = toneIcons[tone];

          return (
            <Toast
              key={entry.id}
              tone={tone}
              duration={entry.duration}
              open={entry.open}
              onOpenChange={(open) => handleOpenChange(entry.id, open)}
            >
              <span aria-hidden="true" className="mt-px shrink-0 [&>svg]:size-20">
                <Icon />
              </span>
              <div className="min-w-0 flex-1">
                {entry.title ? <ToastTitle>{entry.title}</ToastTitle> : null}
                {entry.description ? (
                  <ToastDescription>{entry.description}</ToastDescription>
                ) : null}
              </div>
              <ToastClose />
            </Toast>
          );
        })}
        <ToastViewport />
      </ToastProvider>
    </ToastContext.Provider>
  );
}

export { Toaster, useToast };
export type { ToastOptions };
