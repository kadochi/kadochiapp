import { Divider } from "@/components/ui/divider";
import { Header } from "@/components/layout/header";
import StateMessage from "@/components/layout/state-message";
import { Avatar } from "@/components/ui/avatar";
import { ProductCard } from "@/features/products/components/product-card";
import type { Product } from "@/features/products/types";
import type { PublicPersonalProfile } from "../types";

function formatBirthDate(value: string) {
  return new Intl.DateTimeFormat("fa-IR", { dateStyle: "long" }).format(new Date(`${value}T12:00:00Z`));
}

function tehranDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  return Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)])) as { year: number; month: number; day: number };
}

function birthdayCountdown(value: string) {
  const [, birthMonth, birthDay] = value.split("-").map(Number);
  const today = tehranDateParts(new Date());
  const anniversary = (year: number) => Date.UTC(year, birthMonth - 1, Math.min(birthDay, new Date(Date.UTC(year, birthMonth, 0)).getUTCDate()));
  const currentYearBirthday = anniversary(today.year);
  const todayUtc = Date.UTC(today.year, today.month - 1, today.day);
  const target = currentYearBirthday >= todayUtc ? currentYearBirthday : anniversary(today.year + 1);
  const days = Math.round((target - todayUtc) / 86_400_000);
  return days === 0 ? "امروز تولدشه!" : `${days.toLocaleString("fa-IR")} روز مانده تا تولد`;
}

export function PublicPersonalProfilePage({ profile, products }: { profile: PublicPersonalProfile; products: Product[] }) {
  return (
    <div className="min-h-dvh bg-surface-background" dir="rtl">
      <Header />
      <main className="mx-auto w-full max-w-[1000px] pb-40">
        <section className="flex flex-col items-center px-16 pb-32 pt-24 text-center">
          <Avatar alt={profile.displayName} className="mb-12" size="xl" src={profile.avatarSrc ?? undefined} />
          <h1 className="m-0 text-heading-24 font-bold text-surface-neutral-high-emphasis">{profile.displayName}</h1>
          {profile.birthDate ? (
            <div className="mt-12 inline-flex flex-wrap items-center justify-center gap-8 rounded-full bg-secondary-container px-12 py-8 text-label-14 text-secondary">
              <span>متولد {formatBirthDate(profile.birthDate)}</span>
              <span className="rounded-full bg-secondary px-12 py-4 text-on-secondary">{birthdayCountdown(profile.birthDate)}</span>
            </div>
          ) : null}
        </section>

        {profile.showWishlist ? (
          <>
            <Divider size="md" variant="spacer" />
            <section className="px-16 py-24">
            <div className="mb-20 text-right">
              <h2 className="m-0 text-title-18 font-bold text-secondary">لیست مورد علاقه‌ها</h2>
              <p className="mt-4 text-label-12 text-surface-neutral-mid-emphasis">کادوهای مورد علاقه من</p>
            </div>
            {products.length ? (
              <div className="grid grid-cols-2 gap-x-12 gap-y-24 min-[640px]:grid-cols-4 min-[960px]:grid-cols-5">
                {products.map((product, index) => <ProductCard key={product.id} priority={index < 2} product={product} />)}
              </div>
            ) : (
              <StateMessage imageSrc="/images/wishlist.png" subtitle="هنوز محصولی در این لیست قرار نگرفته است." title="لیست آرزوها خالی است" />
            )}
            </section>
          </>
        ) : null}

        <p className="px-16 pt-16 text-center text-label-12 text-surface-neutral-low-emphasis">پروفایل عمومی @{profile.username} قدرت گرفته از کادوچی</p>
      </main>
    </div>
  );
}

export default PublicPersonalProfilePage;
