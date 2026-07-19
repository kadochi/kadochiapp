import LayoutContent from "@/components/layout/layout-content";

export default function ProductsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <LayoutContent>{children}</LayoutContent>;
}
