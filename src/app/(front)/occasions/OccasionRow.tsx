"use client";

import { Trash2 } from "lucide-react";
import Divider from "@/components/ui/Divider/Divider";
import Button from "@/components/ui/Button/Button";
import type { OccasionEntry } from "./OccasionsClient";
import s from "./occasions.module.css";

export type DayRow = {
  gDate: Date;
  jYear: number;
  jMonth: number;
  jDay: number;
  jMonthName: string;
  weekDayFa: string;
  key: string;
  occasions: OccasionEntry[];
  offset: number;
};

type OccasionRowProps = {
  row: DayRow;
  showDivider: boolean;
  onDelete?: (dateKey: string, occ: OccasionEntry) => void;
};

export default function OccasionRow({
  row,
  showDivider,
  onDelete,
}: OccasionRowProps) {
  const isUrgent = row.offset < 10;
  const showRemainingDays = row.offset > 0 && row.offset < 365;

  return (
    <div>
      <div className={s.item} role="listitem">
        <div className={s.dateCol}>
          <div className={s.weekday}>{row.weekDayFa}</div>
          <div className={s.dayBig}>{row.jDay}</div>
        </div>

        <div
          className={`${s.occasionsCol} ${
            row.occasions.length ? s.hasOccasion : s.noOccasionRow
          }`}
        >
          {row.occasions.length ? (
            row.occasions.map((occ, i) => (
              <div
                key={i}
                className={`${s.occasionCard} ${
                  occ.variant === "private" ? s.occasionCardPrivate : ""
                }`}
                data-variant={occ.variant}
              >
                <span className={s.occTitle}>{occ.title}</span>
                <div className={s.occasionCardRight}>
                  {showRemainingDays && (
                    <span
                      className={`${s.occRemain} ${
                        isUrgent ? s.occRemainUrgent : ""
                      }`}
                    >
                      {row.offset} روز مانده
                    </span>
                  )}
                  {occ.variant === "private" && occ.id != null && (
                    <Button
                      as="button"
                      type="tertiary"
                      style="filled"
                      size="small"
                      className={s.deleteBtn}
                      leadingIcon={<Trash2 size={18} />}
                      aria-label="حذف مناسبت"
                      onClick={() => onDelete?.(row.key, occ)}
                    />
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className={s.noOccasion}>بدون مناسبت</div>
          )}
        </div>
      </div>
      {showDivider && <Divider />}
    </div>
  );
}
