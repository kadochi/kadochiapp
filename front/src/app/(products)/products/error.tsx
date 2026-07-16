"use client";

import StateMessage from "@/components/layout/state-message";
import { Button } from "@/components/ui/button";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <StateMessage
      actions={<Button onClick={reset}>تلاش دوباره</Button>}
      imageSrc="/images/illustration-failed.png"
      title="دریافت محصولات ممکن نشد"
    />
  );
}
