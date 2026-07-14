import { cn } from "@/lib/utils";

export type TopBannerProps = {
  className?: string;
};

/** A compact campaign announcement displayed above the main page content. */
function TopBanner({ className }: Readonly<TopBannerProps>) {
  return (
    <div
      className={cn(
        "flex h-48 w-full items-center justify-center gap-8 bg-primary text-[14px] font-regular text-on-primary",
        className,
      )}
      dir="rtl"
    >
      <span>روز مادر مبارک!</span>
      <a
        className="text-[14px] font-bold text-on-primary underline"
        href="/products?tag=motherday"
      >
        خرید کادو
      </a>
    </div>
  );
}

export { TopBanner };
export default TopBanner;
