import LayoutContent from "@/components/layout/layout-content";

export default function MagazineLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <LayoutContent>{children}</LayoutContent>;
}
