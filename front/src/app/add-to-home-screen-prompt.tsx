"use client";

import { Check, Plus, Share } from "lucide-react";
import { usePathname } from "next/navigation";
import { type ReactNode, useEffect, useRef, useState } from "react";

import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetDescription,
  BottomSheetHeader,
  BottomSheetTitle,
} from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";

const PROMPT_DELAY_MS = 10_000;
const DISMISSAL_DURATION_MS = 21 * 24 * 60 * 60 * 1000;
const DISMISSAL_STORAGE_KEY = "kadochi.pwa-install-dismissed-until";
const SESSION_STORAGE_KEY = "kadochi.pwa-install-prompt-seen";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type PromptContext = {
  isIosSafari: boolean;
  isMobile: boolean;
  isStandalone: boolean;
};

type AnalyticsWindow = Window & {
  gtag?: (command: "event", eventName: string, parameters?: Record<string, string>) => void;
};

function track(eventName: string, parameters: Record<string, string>) {
  (window as AnalyticsWindow).gtag?.("event", eventName, parameters);
}

function isPaymentFlow(pathname: string) {
  return /^\/(checkout|payment)(?:\/|$)/.test(pathname) || pathname.includes("zp-callback");
}

function getPromptContext(): PromptContext {
  const userAgent = navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isIosSafari = isIos
    && navigator.vendor.includes("Apple")
    && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(userAgent);

  return {
    isIosSafari,
    isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent),
    isStandalone: window.matchMedia("(display-mode: standalone)").matches
      || Boolean((navigator as Navigator & { standalone?: boolean }).standalone),
  };
}

function StepGuide({ number, children }: Readonly<{
  number: number;
  children: ReactNode;
}>) {
  return (
    <li className="flex items-center gap-12 py-16">
      <b className="flex size-40 shrink-0 items-center justify-center rounded-rounded bg-surface text-label-16 font-regular text-text-primary">
        {number}
      </b>
      <p className="m-0 min-w-0 flex-1 text-start text-body-16 text-text-primary">
        {children}
      </p>
    </li>
  );
}

/**
 * A non-blocking, mobile-only installation reminder. It intentionally lives in
 * the root layout so route changes cannot reset the ten-second engagement gate.
 */
export default function AddToHomeScreenPrompt() {
  const pathname = usePathname();
  const [context, setContext] = useState<PromptContext | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [delayElapsed, setDelayElapsed] = useState(false);
  const [isSuppressed, setIsSuppressed] = useState(false);
  const [isStorageReady, setIsStorageReady] = useState(false);
  const [open, setOpen] = useState(false);
  const shownRef = useRef(false);

  useEffect(() => {
    const initialisePrompt = window.setTimeout(() => {
      const promptContext = getPromptContext();
      setContext(promptContext);

      if (promptContext.isStandalone) {
        track("pwa_launched_standalone", { platform: promptContext.isIosSafari ? "ios" : "other" });
      }

      const dismissedUntil = Number(window.localStorage.getItem(DISMISSAL_STORAGE_KEY));
      if (Number.isFinite(dismissedUntil) && dismissedUntil > Date.now()) {
        setIsSuppressed(true);
      } else if (dismissedUntil) {
        window.localStorage.removeItem(DISMISSAL_STORAGE_KEY);
      }

      if (window.sessionStorage.getItem(SESSION_STORAGE_KEY)) {
        setIsSuppressed(true);
      }
      setIsStorageReady(true);
    }, 0);

    return () => window.clearTimeout(initialisePrompt);
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDelayElapsed(true), PROMPT_DELAY_MS);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.register("/sw.js").catch(() => {
      // Installation remains optional; manual browser instructions still work.
    });
  }, []);

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  useEffect(() => {
    if (
      !context?.isMobile
      || context.isStandalone
      || !delayElapsed
      || !isStorageReady
      || isSuppressed
      || isPaymentFlow(pathname)
      || shownRef.current
    ) return;

    shownRef.current = true;
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, "true");
    setOpen(true);
    track("pwa_install_prompt_shown", {
      platform: context.isIosSafari ? "ios" : deferredPrompt ? "android_native" : "manual",
    });
  }, [context, deferredPrompt, delayElapsed, isStorageReady, isSuppressed, pathname]);

  useEffect(() => {
    if (!isPaymentFlow(pathname)) return;
    const hidePrompt = window.setTimeout(() => setOpen(false), 0);
    return () => window.clearTimeout(hidePrompt);
  }, [pathname]);

  function dismissPrompt() {
    window.localStorage.setItem(
      DISMISSAL_STORAGE_KEY,
      String(Date.now() + DISMISSAL_DURATION_MS),
    );
    setIsSuppressed(true);
    setOpen(false);
    track("pwa_install_prompt_dismissed", {
      platform: context?.isIosSafari ? "ios" : deferredPrompt ? "android_native" : "manual",
    });
  }

  async function handlePrimaryAction() {
    if (!deferredPrompt || context?.isIosSafari) {
      setOpen(false);
      return;
    }

    track("pwa_install_cta_clicked", { platform: "android" });
    setOpen(false);
    setDeferredPrompt(null);

    try {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
    } catch {
      // The browser can reject the native dialog when it is no longer available.
      // The prompt is already closed, so the customer can continue uninterrupted.
    }
  }

  if (!context?.isMobile || context.isStandalone || isPaymentFlow(pathname)) return null;

  const canUseNativeInstall = Boolean(deferredPrompt) && !context.isIosSafari;
  const isIosGuide = context.isIosSafari;

  return (
    <BottomSheet
      onOpenChange={(nextOpen) => {
        if (!nextOpen && open) dismissPrompt();
      }}
      open={open && !isPaymentFlow(pathname)}
    >
      <BottomSheetContent
        aria-describedby="add-to-home-screen-description"
        footer={
          <div className="flex flex-col gap-8 border-t border-border-low-emphasis bg-surface-background px-16 pb-[max(env(safe-area-inset-bottom),var(--spacing-24))] pt-16">
            <Button className="w-full" onClick={() => void handlePrimaryAction()} size="large" variant="secondary-filled">
              {canUseNativeInstall ? "نصب کادوچی" : "متوجه شدم"}
            </Button>
            <Button className="w-full" onClick={dismissPrompt} size="large" variant="link-ghost">
              فعلاً نه
            </Button>
          </div>
        }
      >
        <BottomSheetHeader className="items-center gap-16 px-16 pb-24 text-center">
          <div className="flex size-104 items-center justify-center rounded-rounded bg-secondary-container text-secondary">
            <Share aria-hidden className="size-48 stroke-[1.75]" />
          </div>
          <BottomSheetTitle className="m-0 font-sans text-heading-24 font-bold text-surface-neutral-high-emphasis">
            کادوچی را به صفحه اصلی اضافه کنید
          </BottomSheetTitle>
          <BottomSheetDescription className="m-0 max-w-[22rem] text-body-16 text-text-secondary" id="add-to-home-screen-description">
            برای دسترسی سریع‌تر و دریافت یادآوری‌های مهم سفارش و مناسبت‌ها.
          </BottomSheetDescription>
        </BottomSheetHeader>

        <div className="px-16 pb-24">
          {isIosGuide ? (
            <ol aria-label="راهنمای افزودن کادوچی به صفحه اصلی" className="m-0 divide-y divide-border-low-emphasis border-y border-border-low-emphasis list-none">
              <StepGuide number={1}>
                در Safari روی آیکن <strong>اشتراک‌گذاری</strong><Share aria-hidden className="mx-4 inline-block size-18 align-text-bottom text-secondary" /> بزنید.
              </StepGuide>
              <StepGuide number={2}>
                گزینه <strong>«Add to Home Screen»</strong><Plus aria-hidden className="mx-4 inline-block size-18 align-text-bottom text-secondary" /> را انتخاب کنید.
              </StepGuide>
              <StepGuide number={3}>
                روی <strong>«Add»</strong><Check aria-hidden className="mx-4 inline-block size-18 align-text-bottom text-secondary" /> بزنید تا کادوچی به صفحه اصلی اضافه شود.
              </StepGuide>
            </ol>
          ) : canUseNativeInstall ? (
            <p className="m-0 border-y border-border-low-emphasis py-16 text-center text-body-16 text-text-secondary">
              با انتخاب «نصب کادوچی»، پنجره نصب مرورگر باز می‌شود.
            </p>
          ) : (
            <p className="m-0 border-y border-border-low-emphasis py-16 text-center text-body-16 text-text-secondary">
              از منوی مرورگر، گزینه «Install app» یا «افزودن به صفحه اصلی» را انتخاب کنید.
            </p>
          )}
        </div>
      </BottomSheetContent>
    </BottomSheet>
  );
}
