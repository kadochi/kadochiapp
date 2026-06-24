"use client";

import React, { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  ariaLabel?: string;
};

export default function BottomSheet({
  isOpen, onClose, children, ariaLabel,
}: Props) {
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex flex-col justify-end items-center bg-[var(--surface-surface-scrim)] z-50 overflow-hidden"
      aria-hidden
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[640px] mx-auto bg-surface-background rounded-t-xl shadow-[0_-8px_24px_rgba(0,0,0,0.08)] translate-y-0"
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        ref={sheetRef}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pt-2 pb-4 flex justify-center">
          <span className="w-32 h-1.5 bg-border-mid rounded-rounded" />
        </div>
        <div className="pt-0 pb-[max(env(safe-area-inset-bottom),1rem)] overflow-y-auto max-h-[calc(100svh-64px)] overscroll-contain">
          {children}
        </div>
      </div>
    </div>
  );
}
