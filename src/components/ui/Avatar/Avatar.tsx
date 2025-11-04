"use client";

import React from "react";
import Image from "next/image";
import s from "./Avatar.module.css";

export type AvatarSize = "small" | "medium" | "large" | "xlarge";

type Props = {
  size?: AvatarSize;
  src?: string;
  alt?: string;
  name?: string;
  initials?: string;
  className?: string;
};

function cx(...p: Array<string | false | undefined>) {
  return p.filter(Boolean).join(" ");
}

function getInitials(input?: string): string | undefined {
  if (!input) return;
  const parts = input.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return;
  if (parts.length === 1) return parts[0][0]?.toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function Avatar({
  size = "medium",
  src,
  alt,
  name,
  initials,
  className,
}: Props) {
  const cls = cx(s.root, s[`size_${size}`], className);
  const text = (initials || getInitials(name || alt))?.slice(0, 2);

  return (
    <span className={cls} aria-label={alt}>
      {src ? (
        // image fills the circle
        <Image className={s.img} src={src} alt={alt ?? ""} fill sizes="100%" />
      ) : text ? (
        // glyph (initials)
        <span className={s.initials} aria-hidden>
          {text}
        </span>
      ) : (
        // default icon
        <img
          className={s.icon}
          src="/icons/user-purple.svg"
          alt="user icon"
          aria-hidden
        />
      )}
    </span>
  );
}
