"use client";

import { CheckCheck, LogIn } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Header } from "@/components/layout/header";
import StateMessage from "@/components/layout/state-message";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-provider";
import { notificationsReadEvent } from "../hooks/use-unread-notifications";
import { listNotifications, markNotificationsRead } from "../services/profile";
import type { Notification } from "../types";

const dateFormatter = new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" });

function notificationOrderId(message: string) {
  return message.match(/سفارش(?:\s+شماره)?\s+#?(\d+)/)?.[1] ?? message.match(/وضعیت سفارش\s+#?(\d+)/)?.[1];
}

function notificationTitle(type: Notification["type"], orderId?: string) {
  if (orderId) {
    switch (type) {
      case "order_placed": return `سفارش ${orderId} با موفقیت ثبت شد.`;
      case "order_preparing": return `سفارش ${orderId} در حال آماده سازی است`;
      case "order_delivered": return `سفارش ${orderId} تحویل داده شد`;
      case "order_cancelled": return `سفارش ${orderId} لغو گردید`;
      case "order_pending_payment": return `سفارش ${orderId} در انتظار پرداخت است`;
    }
  }

  switch (type) {
    case "welcome": return "به کادوچی خوش آمدید";
    case "order_placed": return "سفارش شما ثبت شد";
    case "order_preparing": return "سفارش شما در حال آماده‌سازی است";
    case "order_delivered": return "سفارش شما تحویل داده شد";
    case "order_cancelled": return "سفارش شما لغو گردید";
    case "order_pending_payment": return "سفارش شما در انتظار پرداخت است";
    case "occasion_reminder": return "یادآوری مناسبت";
    default: return "اعلان جدید";
  }
}

function notificationBody(notification: Notification, orderId?: string) {
  if (!orderId) return notification.message;

  switch (notification.type) {
    case "order_placed":
      return "برای مشاهده وضعیت سفارش، به بخش سفارش‌های من در حساب کاربری خود مراجعه کنید.";
    case "order_preparing":
      return "سفارش شما در حال آماده سازی می‌باشد و در زمان انتخاب شده ارسال می‌گردد.";
    case "order_delivered":
      return "سفارش شما توسط پیک به دست گیرنده رسید و تحویل داده شد.";
    case "order_cancelled":
      return "سفارش شما لغو گردید و مطابق قوانین لغو سفارش، پیگیری‌های بعدی انجام می‌شود.";
    case "order_pending_payment":
      return "سفارش شما در انتظار پرداخت می‌باشد و ثبت نهایی نشده است.";
    default:
      return notification.message;
  }
}

function NotificationRow({ notification }: { notification: Notification }) {
  const orderId = notificationOrderId(notification.message);

  return (
    <article className="px-24 py-20 text-right" dir="rtl">
      <div className="grid min-w-0 flex-1 gap-8">
        <h2 className="m-0 text-title-16 font-bold text-surface-neutral-high-emphasis">{notificationTitle(notification.type, orderId)}</h2>
        <p className="m-0 text-body-14 leading-7 text-surface-neutral-mid-emphasis">{notificationBody(notification, orderId)}</p>
        <time className="text-label-12 text-surface-neutral-mid-emphasis" dateTime={notification.createdAt}>{dateFormatter.format(new Date(notification.createdAt))}</time>
      </div>
    </article>
  );
}

export function ProfileNotificationsPage() {
  const router = useRouter();
  const { status } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status !== "authenticated") {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const result = await listNotifications();
        if (cancelled) return;
        setNotifications(result.items);
        if (result.unreadCount > 0) {
          await markNotificationsRead();
          if (!cancelled) window.dispatchEvent(new Event(notificationsReadEvent));
        }
      } catch {
        // The empty state below remains more useful than an unhandled request failure.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [status]);

  if (status === "loading" || (status === "authenticated" && loading)) {
    return <div className="grid min-h-64 place-items-center bg-surface-background text-body-14 text-surface-neutral-mid-emphasis">در حال دریافت اعلان‌ها…</div>;
  }

  if (status !== "authenticated") {
    return <StateMessage actions={<Button onClick={() => router.push("/login?next=/profile/notifications")} size="large" variant="secondary-filled"><LogIn aria-hidden /> ورود به حساب کاربری</Button>} imageSrc="/images/login-illustration.png" subtitle="برای دیدن اعلان‌ها، وارد حساب کاربری خود شوید." title="وارد حساب کاربری شوید" />;
  }

  return (
    <section className="min-h-screen bg-surface-background pb-32">
      <Header backUrl="/profile" title="اعلان‌ها" variant="internal" />
      {notifications.length ? (
        <div className="divide-y divide-border-low-emphasis">
          {notifications.map((notification) => <NotificationRow key={notification.id} notification={notification} />)}
        </div>
      ) : (
        <section className="flex flex-col items-center bg-surface-background px-24 pb-32 pt-40 text-center font-sans" dir="rtl">
          <Image alt="خرس کادوچی در حال نگه داشتن زنگ اعلان" className="h-auto w-full max-w-[320px] object-contain" height={1254} priority src="/images/empty-notifications.png" width={1254} />
          <h2 className="mb-8 mt-24 text-title-16 font-bold text-text-primary">اعلانی ندارید</h2>
          <p className="m-0 text-body-14 text-text-secondary">پیام‌ها و به‌روزرسانی‌های حساب شما اینجا نمایش داده می‌شوند.</p>
        </section>
      )}
      {notifications.length ? <div className="flex justify-center px-24 pt-20 text-label-12 text-surface-neutral-mid-emphasis"><CheckCheck aria-hidden className="ml-6 size-16" />با باز کردن این صفحه، همه اعلان‌ها خوانده شدند.</div> : null}
    </section>
  );
}

export default ProfileNotificationsPage;
