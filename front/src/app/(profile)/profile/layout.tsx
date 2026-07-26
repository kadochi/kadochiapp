import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "کادوچی | حساب کاربری",
  robots: { index: false, follow: false },
};

export default function ProfileLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
