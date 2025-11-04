"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import BottomSheet from "@/components/ui/BottomSheet/BottomSheet";
import SectionHeader from "@/components/layout/SectionHeader/SectionHeader";
import s from "./Sheets.module.css";

type OccasionKey =
  | "none"
  | "birthday"
  | "anniversary"
  | "newyear"
  | "yalda"
  | "graduation"
  | "valentine"
  | "parents";

const ICONS: Record<OccasionKey | "motherday" | "fatherday", string> = {
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

const GRID: Array<{
  key: OccasionKey;
  title: string;
  tags?: string[];
  icon: string;
}> = [
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

function normalizeTagParam(raw?: string | null): string {
  if (!raw) return "";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .join(",");
}

/* ------ اضافه: تعریف مجموعه تگ‌های مناسبتی و کمک‌توابع ------ */
const OCCASION_TAGS = [
  "birthday",
  "anniversary",
  "valentine",
  "newyear",
  "yalda",
  "graduation",
  "fatherday",
  "motherday",
] as const;
const OCC_SET = new Set<string>(OCCASION_TAGS as unknown as string[]);

function parseTags(raw?: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}
function joinTags(tags: string[]) {
  return Array.from(new Set(tags)).join(",");
}

export function isParentsCombo(tagParam: string) {
  if (!tagParam) return false;
  const set = new Set(tagParam.split(","));
  return set.has("motherday") && set.has("fatherday") && set.size === 2;
}

export function titleFromTag(tagParam: string): string | undefined {
  if (!tagParam) return undefined;
  if (isParentsCombo(tagParam)) return "روز مادر یا روز پدر";
  const match = GRID.find(
    (o) => (o.tags ?? []).length === 1 && o.tags![0] === tagParam
  );
  return match?.title?.replace("\n", " ");
}

export default function OccasionsSheet({
  isOpen,
  title = "مناسبت",
}: {
  isOpen: boolean;
  title?: string;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const currentTag = useMemo(() => normalizeTagParam(sp.get("tag")), [sp]);

  // فقط برای تشخیص انتخاب‌شده‌ها: تگ‌های مناسبتیِ فعلی را جدا می‌کنیم
  const occOnly = useMemo(
    () => parseTags(currentTag).filter((t) => OCC_SET.has(t)),
    [currentTag]
  );

  const select = (oc: (typeof GRID)[number]) => {
    const usp = new URLSearchParams(sp.toString());
    const existing = parseTags(usp.get("tag"));
    const nonOcc = existing.filter((t) => !OCC_SET.has(t)); // fast-delivery و … را نگه‌دار

    if (oc.key === "none") {
      // فقط مناسبت‌ها پاک شوند؛ غیرمناسبتی‌ها بمانند
      if (nonOcc.length) usp.set("tag", joinTags(nonOcc));
      else usp.delete("tag");
    } else if (oc.key === "parents") {
      usp.set("tag", joinTags([...nonOcc, "motherday", "fatherday"]));
    } else if (oc.tags?.[0]) {
      usp.set("tag", joinTags([...nonOcc, oc.tags[0]]));
    }

    usp.set("page", "1");
    usp.delete("sheet");
    router.replace(`/products?${usp.toString()}`, { scroll: false });
  };

  const close = () => {
    const usp = new URLSearchParams(sp.toString());
    usp.delete("sheet");
    router.replace(`/products?${usp.toString()}`, { scroll: false });
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={close} ariaLabel={title}>
      <SectionHeader title={title} as="h3" />
      <div className={s.grid} dir="rtl">
        {GRID.map((oc) => {
          // انتخاب‌شده‌بودن با توجه به occOnly (نه کل tag)
          const selected =
            (oc.key === "none" && occOnly.length === 0) ||
            (oc.key === "parents" &&
              occOnly.length === 2 &&
              new Set(occOnly).has("motherday") &&
              new Set(occOnly).has("fatherday")) ||
            (oc.tags?.length === 1 &&
              occOnly.length === 1 &&
              occOnly[0] === oc.tags[0]);

          return (
            <button
              key={oc.key}
              type="button"
              onClick={() => select(oc)}
              aria-pressed={selected}
              className={s.card}
              data-selected={selected ? "true" : "false"}
            >
              <span className={s.iconWrap} aria-hidden>
                <img src={oc.icon} alt="" />
              </span>
              <span className={s.title}>{oc.title}</span>
            </button>
          );
        })}
      </div>
    </BottomSheet>
  );
}
