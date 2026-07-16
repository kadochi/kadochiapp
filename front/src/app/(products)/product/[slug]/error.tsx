"use client";

import StateMessage from "@/components/layout/state-message";
import { Button } from "@/components/ui/button";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <StateMessage
      imageSrc="/images/illustration-failed.png"
      title="مشکلی پیش آمد"
      actions={<Button onClick={reset}>تلاش دوباره</Button>}
    />
  );
}
