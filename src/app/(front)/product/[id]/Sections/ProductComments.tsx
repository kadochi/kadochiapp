// src/app/(front)/product/[id]/Sections/ProductComments.tsx
import React from "react";
import s from "./ProductComments.module.css";
import SectionHeader from "@/components/layout/SectionHeader/SectionHeader";
import Divider from "@/components/ui/Divider/Divider";
import Avatar from "@/components/ui/Avatar/Avatar";
import { Star } from "lucide-react";

export type ProductComment = {
  id: number | string;
  authorName?: string | null;
  avatarUrl?: string | null;
  rating?: number | null;
  date?: string | Date | null;
  content: string;
};

type Props = { comments?: ProductComment[] };

export default function ProductComments({ comments = [] }: Props) {
  const count = comments.length;
  const subtitle = count
    ? `${count.toLocaleString("fa-IR")} نظر ثبت شده`
    : "بدون نظر";

  return (
    <section className={s.root} aria-label="آخرین نظرات کاربران">
      <SectionHeader title="آخرین نظرات کاربران" subtitle={subtitle} />
      <div className={s.box}>
        {count === 0 ? (
          <div className={s.empty}>تاکنون نظری ثبت نشده است.</div>
        ) : (
          <div className={s.list} role="list">
            {comments.map((c, idx) => (
              <React.Fragment key={c.id}>
                <article className={s.item} role="listitem">
                  <div className={s.rowTop}>
                    <div className={s.userSide}>
                      <Avatar
                        size="medium"
                        src={c.avatarUrl || undefined}
                        name={c.authorName || "کاربر"}
                      />
                      <div className={s.nameDate}>
                        <div className={s.name}>
                          {c.authorName?.trim() || "کاربر"}
                        </div>
                        <div className={s.date}>{formatFaDate(c.date)}</div>
                      </div>
                    </div>

                    <div className={s.rating} aria-label="امتیاز کاربر">
                      <Star size={16} className={s.starIcon} aria-hidden />
                      <span className={s.ratingText}>
                        {Number(c.rating ?? 0).toLocaleString("fa-IR", {
                          maximumFractionDigits: 1,
                        })}
                      </span>
                    </div>
                  </div>

                  <p className={s.text}>{c.content}</p>
                </article>

                {idx !== count - 1 && <Divider />}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/* ---- helpers ---- */
function formatFaDate(d?: string | Date | null) {
  if (!d) return "";
  try {
    const date = typeof d === "string" ? new Date(d) : d;
    return date.toLocaleDateString("fa-IR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "";
  }
}
