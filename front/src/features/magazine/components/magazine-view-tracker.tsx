"use client";

import { useEffect } from "react";

/** Counts a visit only after the reader has had time to engage with the article. */
export function MagazineViewTracker({ postId }: Readonly<{ postId: number }>) {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetch(`/api/magazine/${postId}/views`, {
        method: "POST",
        credentials: "same-origin",
        keepalive: true,
      }).catch(() => undefined);
    }, 15_000);

    return () => window.clearTimeout(timer);
  }, [postId]);

  return null;
}
