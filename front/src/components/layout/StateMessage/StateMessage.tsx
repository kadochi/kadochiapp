"use client";

import React from "react";
import s from "./StateMessage.module.css";

type Props = {
  imageSrc: string;
  imageAlt?: string;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
};

export default function StateMessage({
  imageSrc,
  imageAlt = "",
  title,
  subtitle,
  actions,
  className = "",
}: Props) {
  return (
    <section
      className={`${s.wrap} ${className}`}
      role="status"
      aria-live="polite"
    >
      <img
        src={imageSrc}
        alt={imageAlt}
        width={200}
        height={200}
        className={s.image}
        loading="lazy"
      />
      <h2 className={s.title}>{title}</h2>
      {subtitle && <p className={s.subtitle}>{subtitle}</p>}
      {actions && <div className={s.actions}>{actions}</div>}
    </section>
  );
}
