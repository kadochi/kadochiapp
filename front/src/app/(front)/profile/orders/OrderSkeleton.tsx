"use client";

import s from "./orders.module.css";

export default function OrderSkeleton() {
  return (
    <div className={s.skelOrder}>
      <div className={s.skelRowTop}>
        <div className={s.skelMeta}>
          <div className={`${s.skelLine} ${s.skelLineLong}`} />
          <div className={`${s.skelLine} ${s.skelLineShort}`} />
        </div>
        <div className={`${s.skelLine} ${s.skelLineShort}`} />
      </div>

      <div className={s.skelRowBottom}>
        <div className={s.skelPrice} />

        <div className={s.skelThumbs}>
          <div className={s.skelThumb} />
          <div className={s.skelThumb} />
        </div>
      </div>
    </div>
  );
}
