import Link from "next/link";

import StateMessage from "@/components/layout/state-message";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[calc(100dvh-5.5rem)]">
      <StateMessage
        className="my-auto w-full"
        imageAlt="صفحه پیدا نشد"
        imageSrc="/images/illustration-404.png"
        subtitle="متاسفانه صفحه مورد نظر پیدا نشد."
        title="خطای ۴۰۴"
        actions={
          <Button asChild size="medium" variant="tertiary-outline">
            <Link aria-label="برگشت به صفحه اصلی" href="/">برگرد به صفحه اصلی</Link>
          </Button>
        }
      />
    </div>
  );
}
