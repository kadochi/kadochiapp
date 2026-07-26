import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "کادوچی | پیش‌نمایش رابط کاربری",
  robots: { index: false, follow: false },
};

export default function PreviewLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
