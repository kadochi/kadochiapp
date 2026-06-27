/**
 * AllFiltersSheet constants, types, and pure helpers.
 * Extracted from AllFiltersSheet.client.tsx (no behavior change).
 */

import type { SegmentItem } from "@/components/ui/SegmentSelector/SegmentSelector";

export type CategoryItem = { label: string; value: string };

export type OccasionKey =
  | "none"
  | "birthday"
  | "anniversary"
  | "newyear"
  | "yalda"
  | "graduation"
  | "valentine"
  | "parents";

export type OccasionItem = {
  key: OccasionKey;
  title: string;
  tags?: string[];
  icon: string;
};

export type SortId = "latest" | "oldest" | "popular";

export const ICONS: Record<OccasionKey | "motherday" | "fatherday", string> = {
  none: "/images/filters-occasion-none.png",
  birthday: "/images/filters-occasion-birthday.png",
  anniversary: "/images/filters-occasion-anniv.png",
  newyear: "/images/filters-occasion-newyear.png",
  yalda: "/images/filters-occasion-yalda.png",
  graduation: "/images/filters-occasion-grad.png",
  valentine: "/images/filters-occasion-valentine.png",
  parents: "/images/filters-occasion-mother-father.png",
  motherday: "/images/filters-occasion-mother-father.png",
  fatherday: "/images/filters-occasion-mother-father.png",
};

export const OCCASIONS: OccasionItem[] = [
  {
    key: "parents",
    title: "روز مادر یا\nروز پدر",
    tags: ["motherday", "fatherday"],
    icon: ICONS.parents,
  },
  {
    key: "anniversary",
    title: "سالگرد\nازدواج",
    tags: ["anniversary"],
    icon: ICONS.anniversary,
  },
  {
    key: "birthday",
    title: "جشن\nتولد",
    tags: ["birthday"],
    icon: ICONS.birthday,
  },
  { key: "none", title: "بدون\nمناسبت", icon: ICONS.none },
  {
    key: "graduation",
    title: "شروع\nمسیر جدید",
    tags: ["graduation"],
    icon: ICONS.graduation,
  },
  {
    key: "newyear",
    title: "عید\nنوروز",
    tags: ["newyear"],
    icon: ICONS.newyear,
  },
  { key: "yalda", title: "شب\nیلدا", tags: ["yalda"], icon: ICONS.yalda },
  {
    key: "valentine",
    title: "روز عشق\nولنتاین",
    tags: ["valentine"],
    icon: ICONS.valentine,
  },
];

export const sortItems: SegmentItem[] = [
  { id: "latest", label: "جدیدترین" },
  { id: "oldest", label: "قدیمی‌ترین" },
  { id: "popular", label: "محبوب‌ترین" },
];

export const onlyDigits = (v: string) =>
  v
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[^\d]/g, "");

export const withThousands = (v: string) =>
  v ? v.replace(/^0+/, "").replace(/\B(?=(\d{3})+(?!\d))/g, ",") : "";

export const toInt = (v: string) => {
  const d = onlyDigits(v);
  return d ? Number(d) : 0;
};

export const normTags = (raw?: string | null) =>
  raw
    ? raw
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    : [];
