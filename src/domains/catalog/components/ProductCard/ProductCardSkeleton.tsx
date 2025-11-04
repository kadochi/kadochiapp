"use client";

import React from "react";
import s from "./ProductCard.module.css";

export default function ProductCardSkeleton() {
  return (
    <div className={`${s.card} ${s.skelCard}`} dir="rtl" aria-hidden>
      <div className={s.imgWrap}>
        <div className={s.skelImg} />
      </div>

      <div className={s.info}>
        <div className={`${s.skelTitleRow} ${s.skelTitleTop}`} />
        <div className={`${s.skelTitleRow} ${s.skelTitleBottom}`} />
        <div className={s.skelPrice} />
      </div>
    </div>
  );
}
