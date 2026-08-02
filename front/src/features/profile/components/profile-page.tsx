"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bookmark, ChevronLeft, CircleHelp, Globe2, Heart, LogIn, LogOut, MapPin, Package, UserRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Divider } from "@/components/ui/divider";
import StateMessage from "@/components/layout/state-message";
import { useAuth } from "@/features/auth/auth-provider";
import { cn } from "@/lib/utils";
import { useProfileCompletion } from "../hooks/use-profile-completion";
import type { ProfileCompletion } from "../utils/profile-completion";

type MenuItemProps = {
  href?: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  tone?: "default" | "danger";
  onClick?: () => void;
};

function ProfileMenuItem({ href, title, subtitle, icon: Icon, tone = "default", onClick }: MenuItemProps) {
  const iconClassName = tone === "danger" ? "text-error" : "text-surface-neutral-mid-emphasis";
  const content = (
    <>
      <Icon aria-hidden className={`size-24 shrink-0 ${iconClassName}`} strokeWidth={1.75} />
      <span className="grid min-w-0 flex-1 gap-4 text-right">
        <strong className={tone === "danger" ? "text-title-16 min-[580px]:text-title-18 text-error" : "text-title-16 min-[580px]:text-title-18 text-surface-neutral-high-emphasis"}>{title}</strong>
        <span className="text-label-12 min-[580px]:text-body-14 text-surface-neutral-mid-emphasis">{subtitle}</span>
      </span>
      <ChevronLeft aria-hidden className="size-32 text-surface-neutral-mid-emphasis" />
    </>
  );
  const className = "flex w-full items-center gap-16 bg-surface-background px-16 pb-16 pt-24 text-right no-underline transition-colors hover:bg-surface-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-secondary";

  return href ? (
    <Link className={className} href={href}>{content}</Link>
  ) : (
    <button className={cn(className, "border-0")} onClick={onClick} type="button">{content}</button>
  );
}

function ProfileLoading() {
  return (
    <div className="grid gap-16 px-16 py-24" aria-label="در حال دریافت حساب کاربری">
      <div className="h-96 animate-pulse rounded-l bg-surface" />
      <div className="h-80 animate-pulse rounded-m bg-surface" />
      <div className="h-80 animate-pulse rounded-m bg-surface" />
    </div>
  );
}

const persianNumber = new Intl.NumberFormat("fa-IR", { useGrouping: false });

function CompletionRing({ percentage }: { percentage: number }) {
  const label = `${persianNumber.format(percentage)}٪`;

  return (
    <div aria-label={`پیشرفت تکمیل پروفایل: ${label}`} className="relative grid size-32 shrink-0 place-items-center" role="img">
      <svg aria-hidden className="size-full -rotate-90" viewBox="0 0 36 36">
        <circle cx="18" cy="18" fill="none" r="15.25" stroke="var(--color-border-high-emphasis)" strokeWidth="2" />
        <circle cx="18" cy="18" fill="none" pathLength="100" r="15.25" stroke="var(--color-secondary)" strokeDasharray="100" strokeDashoffset={100 - percentage} strokeLinecap="round" strokeWidth="2" />
      </svg>
      <span aria-hidden className="absolute text-label-12 font-bold text-surface-neutral-high-emphasis">{label}</span>
    </div>
  );
}

function ProfileCompletionBadge({ completion }: { completion: ProfileCompletion }) {
  const badge = completion.level === "newcomer"
    ? { label: "تکمیل پروفایل", className: "bg-secondary-container text-secondary" }
    : completion.level === "regular"
      ? { label: "کاربر عادی", className: "bg-success-container text-on-success-container" }
      : { label: "کاربر حرفه‌ای", className: "bg-secondary text-on-secondary" };
  const content = <><span className={cn("rounded-rounded px-12 py-8 text-label-14 font-bold", badge.className)}>{badge.label}</span>{completion.level === "newcomer" ? <CompletionRing percentage={completion.percentage} /> : null}</>;
  const className = "flex shrink-0 items-center gap-6 no-underline focus-visible:rounded-rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary";

  return completion.level === "pro" ? <div className={className}>{content}</div> : <Link aria-label="مشاهده ماموریت‌های پروفایل" className={className} href="/profile/completion">{content}</Link>;
}

export function ProfilePage() {
  const router = useRouter();
  const { customer, logout, status } = useAuth();
  const { completion, loading: completionLoading } = useProfileCompletion(customer);

  if (status === "loading") return <ProfileLoading />;

  if (status !== "authenticated" || !customer) {
    return (
      <>
        <StateMessage
          actions={<Button onClick={() => router.push("/login?next=/profile")} size="large" variant="secondary-filled"><LogIn aria-hidden /> ورود به حساب کاربری</Button>}
          imageSrc="/images/login-illustration.png"
          subtitle="برای دسترسی به امکانات و ثبت سفارش، وارد حساب کاربری خود شوید."
          title="وارد حساب کاربری شوید"
        />
        <Divider size="md" variant="spacer" />
        <div className="px-16">
          <ProfileMenuItem href="/contact" icon={CircleHelp} subtitle="پیگیری سفارش‌ها و تراکنش‌های مالی" title="پشتیبانی کادوچی" />
        </div>
      </>
    );
  }

  const fullName = [customer.firstName, customer.lastName].filter(Boolean).join(" ").trim();
  const displayName = fullName || customer.displayName || customer.phone;

  return (
    <section className="bg-surface-background pb-[calc(var(--bottom-nav-safe,0px)+var(--spacing-32))]" dir="rtl">
      <div className="flex items-center justify-between gap-16 px-24 py-16">
        <div className="flex min-w-0 items-center gap-16">
          <Avatar alt={displayName} size="lg" src={customer.avatarSrc ?? undefined} />
          <div className="grid min-w-0 gap-4">
            <h1 className="m-0 truncate text-title-16 font-bold text-surface-neutral-high-emphasis">{displayName}</h1>
            <p className="m-0 text-body-14 text-surface-neutral-mid-emphasis">حساب کاربری</p>
          </div>
        </div>
        {completion && !completionLoading ? <ProfileCompletionBadge completion={completion} /> : null}
      </div>

      <Divider />

      <div className="px-16">
        <ProfileMenuItem href="/profile/info" icon={UserRound} subtitle="مشخصات و اطلاعات شخصی" title="اطلاعات حساب کاربری" />
        <Divider />
        <ProfileMenuItem href="/profile/personal-profile" icon={Globe2} subtitle="ساخت و مدیریت صفحه عمومی شما" title="پروفایل شخصی" />
        <Divider />
        <ProfileMenuItem href="/profile/orders" icon={Package} subtitle="سفارش‌های در انتظار و تکمیل‌شده" title="سفارش‌های من" />
        <Divider />
        <ProfileMenuItem href="/profile/addresses" icon={MapPin} subtitle="افزودن و مدیریت نشانی‌های دریافت سفارش" title="آدرس‌ها" />
        <Divider />
        <ProfileMenuItem href="/profile/wishlist" icon={Bookmark} subtitle="محصول‌هایی که برای بعد ذخیره کرده‌اید" title="لیست آرزوها" />
        <Divider />
        <ProfileMenuItem href="/profile/favorites" icon={Heart} subtitle="محصول‌هایی که پسندیده‌اید" title="مورد علاقه‌ها" />
        <Divider />
        <ProfileMenuItem
          onClick={() => {
            void logout().finally(() => router.replace("/profile"));
          }}
          icon={LogOut}
          subtitle="خارج شدن از حساب کاربری کادوچی"
          title="خروج از حساب"
          tone="danger"
        />
      </div>
    </section>
  );
}

export default ProfilePage;
