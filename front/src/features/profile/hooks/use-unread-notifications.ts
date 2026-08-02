"use client";

import { useEffect, useState } from "react";

import { listNotifications } from "../services/profile";

export const notificationsReadEvent = "kadochi-notifications-read";

/** Keeps persistent-navigation badges in sync with the notification center. */
export function useUnreadNotifications(enabled: boolean) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;
    void listNotifications()
      .then((notifications) => {
        if (!cancelled) setUnreadCount(notifications.unreadCount);
      })
      .catch(() => undefined);

    const markRead = () => setUnreadCount(0);
    window.addEventListener(notificationsReadEvent, markRead);
    return () => {
      cancelled = true;
      window.removeEventListener(notificationsReadEvent, markRead);
    };
  }, [enabled]);

  return enabled ? unreadCount : 0;
}
