import Link from "next/link";

import StateMessage from "@/components/layout/state-message";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <StateMessage
      imageSrc="/images/illustration-404.png"
      title="محصول پیدا نشد"
      actions={
        <Button asChild>
          <Link href="/">بازگشت به خانه</Link>
        </Button>
      }
    />
  );
}
