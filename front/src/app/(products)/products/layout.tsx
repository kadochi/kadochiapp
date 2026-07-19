import { BottomNavigation } from "@/components/layout/bottom-navigation";

export default function ProductsIndexLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <BottomNavigation />
    </>
  );
}
