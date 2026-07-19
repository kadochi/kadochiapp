import LayoutContent from "@/components/layout/layout-content";

export default function OccasionsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <LayoutContent showBottomNav>{children}</LayoutContent>;
}
