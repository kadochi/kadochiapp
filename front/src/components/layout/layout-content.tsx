import type { ReactNode } from "react";
import { BottomNavigation } from "./bottom-navigation";
import { Footer } from "./footer";
import { Header, type HeaderProps } from "./header";
import { TopBanner } from "./top-banner";
import { cn } from "@/lib/utils";

export type LayoutContentProps = {
  children: ReactNode;
  className?: string;
  mainClassName?: string;
  headerProps?: HeaderProps;
  /** Hides the shared footer for focused, full-viewport flows. */
  showFooter?: boolean;
  /** Shows the mobile-only bottom navigation for this page. */
  showBottomNav?: boolean;
};

/**
 * Shared shell for static content pages.
 *
 * The growing main region keeps the footer at the bottom of the viewport when
 * a page has little or no content.
 */
function LayoutContent({
  children,
  className,
  mainClassName,
  headerProps,
  showBottomNav = false,
  showFooter = true,
}: Readonly<LayoutContentProps>) {
  return (
    <div className={cn("flex min-h-dvh flex-col", className)}>
      <TopBanner />
      <Header {...headerProps} />
      <main className={cn("mx-auto w-full max-w-[1440px] flex-1", mainClassName)}>{children}</main>
      {showFooter ? <Footer /> : null}
      {showBottomNav ? <BottomNavigation /> : null}
    </div>
  );
}

export { LayoutContent };
export default LayoutContent;
