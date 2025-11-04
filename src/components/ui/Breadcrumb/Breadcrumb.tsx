"use client";
import React, { useEffect, useRef } from "react";
import s from "./Breadcrumb.module.css";

export type Crumb = { label: string; href?: string };

type Props = { items: Crumb[]; className?: string };

function cx(...a: Array<string | false | undefined>) {
  return a.filter(Boolean).join(" ");
}

export default function Breadcrumb({ items, className }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    el.scrollLeft = 0;
  }, [items]);

  const lastIndex = items.length - 1;

  return (
    <nav
      aria-label="breadcrumb"
      className={cx(s.root, className)}
      ref={wrapRef}
    >
      <ol className={s.list}>
        {items.map((it, i) => {
          const isCurrent = i === lastIndex;
          const showSep = i !== 0;
          return (
            <li key={i} className={s.li}>
              {showSep && <span className={s.sep}>/</span>}
              {it.href && !isCurrent ? (
                <a href={it.href} className={s.item}>
                  {it.label}
                </a>
              ) : (
                <span
                  className={cx(s.item, isCurrent && s.current)}
                  aria-current={isCurrent ? "page" : undefined}
                >
                  {it.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
