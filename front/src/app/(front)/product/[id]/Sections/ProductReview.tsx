"use client";

import React, { useMemo, useState } from "react";
import s from "./ProductReview.module.css";
import SectionHeader from "@/components/layout/SectionHeader/SectionHeader";
import Button from "@/components/ui/Button/Button";
import TextArea from "@/components/ui/TextArea/TextArea";
import Link from "next/link";
import { useOptionalSession } from "@/domains/auth/session-context";
import { Star } from "lucide-react";

type Props = {
  productId: number | string;
  ratingAvg?: number;
  ratingCount?: number;
  onSubmit?: (args: {
    productId: number | string;
    rating: number;
    text: string;
  }) => Promise<void> | void;
};

export default function ProductReview({
  productId,
  ratingAvg = 0,
  ratingCount = 0,
  onSubmit,
}: Props) {
  const sessionCtx = useOptionalSession();
  const isLoggedIn = !!sessionCtx?.session?.userId;

  const avgLabel = useMemo(
    () =>
      `${Number(ratingAvg).toLocaleString("fa-IR", {
        maximumFractionDigits: 1,
      })} امتیاز`,
    [ratingAvg]
  );
  const countLabel = useMemo(
    () => `(از ${Number(ratingCount).toLocaleString("fa-IR")} کاربر)`,
    [ratingCount]
  );

  const [text, setText] = useState("");
  const [rating, setRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState<string | null>(null);

  const canSubmit =
    isLoggedIn && rating > 0 && text.trim().length > 0 && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    try {
      setSubmitErr(null);
      setSubmitting(true);

      if (onSubmit) {
        await onSubmit({ productId, rating, text: text.trim() });
      } else {
        const r = await fetch("/api/reviews", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ productId, rating, text: text.trim() }),
          credentials: "same-origin",
          cache: "no-store",
        });
        const json = await r.json().catch(() => null);
        if (!r.ok || json?.ok === false) {
          throw new Error(json?.error || `HTTP ${r.status}`);
        }
      }

      setText("");
      setRating(0);
    } catch (e: any) {
      setSubmitErr(e?.message || "ارسال نظر ناموفق بود.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className={s.root} aria-label="نقد و بررسی">
      <SectionHeader
        as="h3"
        title="نقد و بررسی"
        subtitle="نظرات و امتیازات کاربران"
        leftSlot={
          <div className={s.avgBox} aria-label="میانگین امتیاز">
            <Star size={18} className={s.avgStar} aria-hidden />
            <div className={s.avgTextWrap}>
              <div className={s.avgTop}>{avgLabel}</div>
              <div className={s.avgSub}>{countLabel}</div>
            </div>
          </div>
        }
      />

      {!isLoggedIn ? (
        <div className={s.card}>
          <p className={s.loginMsg}>برای درج نظر وارد حساب کاربری خود شوید.</p>
          <Button
            as={Link as any}
            href="/login"
            className={s.loginBtn}
            type="tertiary"
            style="outline"
            size="medium"
            leadingIcon={<img src="/icons/user-login.svg" alt="" aria-hidden />}
            aria-label="ورود به حساب کاربری"
          >
            ورود به حساب کاربری
          </Button>
        </div>
      ) : (
        <div className={s.formWrapLoggedin}>
          <TextArea
            label="نظر شما"
            showLabel={false}
            required={false}
            disabled={false}
            placeholder="نظر خود را وارد کنید."
            showMessage={!!submitErr}
            messageType={submitErr ? "error" : "hint"}
            message={submitErr || undefined}
            rows={4}
            showCounter={true}
            maxLength={300}
            dir="rtl"
            value={text}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              setText(e.target.value)
            }
          />

          <div className={s.formBottom}>
            <div className={s.stars} role="radiogroup" aria-label="امتیاز شما">
              {[1, 2, 3, 4, 5].map((n) => {
                const active = rating >= n;
                return (
                  <button
                    key={n}
                    type="button"
                    className={s.starBtn}
                    aria-label={`${n} ستاره`}
                    aria-pressed={active}
                    onClick={() => setRating(n)}
                    data-active={active}
                  >
                    <Star size={16} />
                  </button>
                );
              })}
            </div>

            <Button
              type="tertiary"
              style="outline"
              size="medium"
              onClick={handleSubmit}
              disabled={!canSubmit}
              loading={submitting}
              className={s.submitBtn}
            >
              ثبت نظر
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
