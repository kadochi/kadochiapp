import type { ReactNode } from "react";
import { Footer } from "./footer";
import { Header, type HeaderProps } from "./header";
import { cn } from "@/lib/utils";

export type LayoutContentProps = {
  children: ReactNode;
  className?: string;
  mainClassName?: string;
  headerProps?: HeaderProps;
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
}: Readonly<LayoutContentProps>) {
  return (
    <div className={cn("flex min-h-dvh flex-col", className)}>
      <Header {...headerProps} />
      <main className={cn("flex-1", mainClassName)}>{children}</main>
      <Footer />
    </div>
  );
}

export { LayoutContent };
export default LayoutContent;
