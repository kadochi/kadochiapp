"use client";

import s from "./StaticPage.module.css";

export function PageTitle({ children }: { children: React.ReactNode }) {
  return <h1 className={s.pageTitle}>{children}</h1>;
}

export function SectionHeader({ children }: { children: React.ReactNode }) {
  return <h2 className={s.sectionHeader}>{children}</h2>;
}

export function Paragraph({ children }: { children: React.ReactNode }) {
  return <p className={s.paragraph}>{children}</p>;
}

export default function StaticPage({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className={s.wrapper}>{children}</div>;
}
