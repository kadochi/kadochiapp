"use client";

import React, { useEffect, useRef } from "react";
import s from "./BottomSheet.module.css";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  ariaLabel?: string;
};

export default function BottomSheet({
  isOpen,
  onClose,
  children,
  ariaLabel,
}: Props) {
  const sheetRef = useRef<HTMLDivElement>(null);

  // close on ESC
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  // simple scroll lock
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className={s.backdrop} aria-hidden onClick={onClose}>
      <div
        className={s.panel}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        ref={sheetRef}
        onClick={(e) => e.stopPropagation()}
      >
        {/* handler area */}
        <div className={s.handlerArea}>
          <span className={s.handler} />
        </div>

        {/* content */}
        <div className={s.content}>{children}</div>
      </div>
    </div>
  );
}
