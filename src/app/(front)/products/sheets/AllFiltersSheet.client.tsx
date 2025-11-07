"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import BottomSheet from "@/components/ui/BottomSheet/BottomSheet";
import SectionHeader from "@/components/layout/SectionHeader/SectionHeader";
import Divider from "@/components/ui/Divider/Divider";
import Chip from "@/components/ui/Chip/Chip";
import Input from "@/components/ui/Input/Input";
import Button from "@/components/ui/Button/Button";
import Toggle from "@/components/ui/Toggle/Toggle";
import SegmentSelector, {
  type SegmentItem,
} from "@/components/ui/SegmentSelector/SegmentSelector";
import { X, Trash2 } from "lucide-react";
import s from "./Sheets.module.css";

type CategoryItem = { label: string; value: string };

type OccasionKey =
  | "none"
  | "birthday"
  | "anniversary"
  | "newyear"
  | "yalda"
  | "graduation"
  | "valentine"
  | "parents";

type OccasionItem = {
  key: OccasionKey;
  title: string;
  tags?: string[];
  icon: string;
};

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

const OCCASIONS: OccasionItem[] = [
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

const onlyDigits = (v: string) =>
  v
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[^\d]/g, "");
const withThousands = (v: string) =>
  v ? v.replace(/^0+/, "").replace(/\B(?=(\d{3})+(?!\d))/g, ",") : "";
const toInt = (v: string) => {
  const d = onlyDigits(v);
  return d ? Number(d) : 0;
};
const normTags = (raw?: string | null) =>
  raw
    ? raw
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    : [];

type SortId = "latest" | "oldest" | "popular";
const sortItems: SegmentItem[] = [
  { id: "latest", label: "جدیدترین" },
  { id: "oldest", label: "قدیمی‌ترین" },
  { id: "popular", label: "محبوب‌ترین" },
];

export default function AllFiltersSheet({
  isOpen,
  onClose,
  categories,
}: {
  isOpen: boolean;
  onClose?: () => void;
  categories: CategoryItem[];
}) {
  const router = useRouter();
  const sp = useSearchParams();

  const closeSafe = useCallback(() => {
    if (onClose) return onClose();
    const usp = new URLSearchParams(sp.toString());
    usp.delete("sheet");
    router.replace(`/products?${usp.toString()}`, { scroll: false });
  }, [onClose, router, sp]);

  const urlOrderby = (sp.get("orderby") || "date").toLowerCase();
  const urlOrder = (sp.get("order") || "desc").toLowerCase() as "asc" | "desc";
  const urlCategory = sp.get("category") || "";
  const urlTags = useMemo(() => normTags(sp.get("tag")), [sp]);
  const urlMin = sp.get("min_price") || "";
  const urlMax = sp.get("max_price") || "";

  const [sort, setSort] = useState<SortId>(
    urlOrderby === "popularity"
      ? "popular"
      : urlOrder === "asc"
      ? "oldest"
      : "latest"
  );
  const [category, setCategory] = useState<string>(urlCategory);
  const [fast, setFast] = useState<boolean>(urlTags.includes("fast-delivery"));

  const initialOccasion: OccasionKey = (() => {
    const t = urlTags.filter((x) => x !== "fast-delivery");
    if (t.includes("motherday") && t.includes("fatherday")) return "parents";
    const single = [
      "birthday",
      "anniversary",
      "newyear",
      "yalda",
      "graduation",
      "valentine",
    ] as const;
    for (const k of single) if (t.includes(k)) return k as OccasionKey;
    return "none";
  })();
  const [occasion, setOccasion] = useState<OccasionKey>(initialOccasion);

  const [minStr, setMinStr] = useState<string>(
    withThousands(onlyDigits(urlMin))
  );
  const [maxStr, setMaxStr] = useState<string>(
    withThousands(onlyDigits(urlMax))
  );

  useEffect(() => {
    const oBy = (sp.get("orderby") || "date").toLowerCase();
    const o = (sp.get("order") || "desc").toLowerCase() as "asc" | "desc";
    setSort(
      oBy === "popularity" ? "popular" : o === "asc" ? "oldest" : "latest"
    );
    setCategory(sp.get("category") || "");
    const t = normTags(sp.get("tag"));
    setFast(t.includes("fast-delivery"));
    const tNoFast = t.filter((x) => x !== "fast-delivery");
    if (tNoFast.includes("motherday") && tNoFast.includes("fatherday"))
      setOccasion("parents");
    else {
      const singles: OccasionKey[] = [
        "birthday",
        "anniversary",
        "newyear",
        "yalda",
        "graduation",
        "valentine",
      ];
      const found = singles.find((k) => tNoFast.includes(k));
      setOccasion(found ?? "none");
    }
    setMinStr(withThousands(onlyDigits(sp.get("min_price") || "")));
    setMaxStr(withThousands(onlyDigits(sp.get("max_price") || "")));
  }, [isOpen, sp]);

  const [isApplying, setIsApplying] = useState(false);

  const applyAll = useCallback(() => {
    setIsApplying(true);
    const usp = new URLSearchParams(sp.toString());

    if (sort === "popular") {
      usp.set("orderby", "popularity");
      usp.set("order", "desc");
    } else if (sort === "oldest") {
      usp.set("orderby", "date");
      usp.set("order", "asc");
    } else {
      usp.set("orderby", "date");
      usp.set("order", "desc");
    }

    if (category) usp.set("category", category);
    else usp.delete("category");

    const tags: string[] = [];
    if (occasion === "parents") tags.push("motherday", "fatherday");
    else if (occasion !== "none") {
      const item = OCCASIONS.find((o) => o.key === occasion);
      if (item?.tags?.[0]) tags.push(item.tags[0]);
    }
    if (fast) tags.push("fast-delivery");
    if (tags.length) usp.set("tag", Array.from(new Set(tags)).join(","));
    else usp.delete("tag");

    const nMin = toInt(minStr);
    const nMax = toInt(maxStr);
    if (nMin > 0) usp.set("min_price", String(nMin));
    else usp.delete("min_price");
    if (nMax > 0) usp.set("max_price", String(nMax));
    else usp.delete("max_price");

    usp.set("page", "1");
    usp.delete("sheet");
    router.replace(`/products?${usp.toString()}`, { scroll: false });

    setTimeout(() => setIsApplying(false), 400);
  }, [sp, router, sort, category, occasion, fast, minStr, maxStr]);

  const clearAll = () => {
    setSort("latest");
    setCategory("");
    setOccasion("none");
    setFast(false);
    setMinStr("");
    setMaxStr("");
  };

  const activeCount =
    (sort !== "latest" ? 1 : 0) +
    (category ? 1 : 0) +
    (occasion !== "none" ? 1 : 0) +
    (fast ? 1 : 0) +
    (minStr || maxStr ? 1 : 0);

  return (
    <BottomSheet isOpen={isOpen} onClose={closeSafe} ariaLabel="فیلترها">
      <div className={s.sheetHeader}>
        <SectionHeader
          title="فیلترها"
          as="h3"
          leftSlot={
            <button
              type="button"
              onClick={closeSafe}
              aria-label="بستن"
              style={{
                width: 32,
                height: 32,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                border: "none",
                background: "transparent",
                padding: 0,
                cursor: "pointer",
              }}
            >
              <X size={24} className={s.closeIcon} />
            </button>
          }
        />
      </div>

      <div className={s.sheetBody} dir="rtl">
        <SectionHeader title="مرتب‌سازی" as="h4" />
        <div className={s.segment}>
          <SegmentSelector
            items={sortItems}
            value={sort}
            onChange={(id: string) => setSort(id as SortId)}
          />
        </div>

        <Divider type="spacer" />

        <SectionHeader title="دسته‌بندی" as="h4" />
        <div className={s.segmentWrap}>
          <Chip
            state={category ? "default" : "active"}
            onClick={() => setCategory("")}
          >
            همه دسته‌بندی‌ها
          </Chip>
          {categories
            .filter((c) => c.value && c.value !== "none")
            .map((c) => (
              <Chip
                key={c.value}
                state={category === c.value ? "active" : "default"}
                onClick={() => setCategory(c.value)}
              >
                {c.label}
              </Chip>
            ))}
        </div>

        <Divider type="spacer" />

        <SectionHeader
          title="ارسال سریع امروز"
          as="h4"
          leftSlot={
            <Toggle
              checked={fast}
              onChange={() => setFast((p) => !p)}
              aria-label="ارسال سریع امروز"
            />
          }
        />

        <Divider type="spacer" />

        <SectionHeader title="مناسبت" as="h4" />
        <div className={s.grid} dir="rtl">
          {OCCASIONS.map((oc) => {
            const selected = occasion === oc.key;
            return (
              <button
                key={oc.key}
                type="button"
                className={s.card}
                data-selected={selected ? "true" : "false"}
                onClick={() => setOccasion(oc.key)}
                aria-pressed={selected}
              >
                <span className={s.iconWrap} aria-hidden>
                  <img src={oc.icon} alt="" />
                </span>
                <span className={s.title}>{oc.title}</span>
              </button>
            );
          })}
        </div>

        <Divider type="spacer" />

        <SectionHeader title="بازه قیمت" as="h4" />
        <div className={s.priceRow}>
          <Input
            dir="ltr"
            label="از قیمت"
            placeholder="0"
            value={minStr}
            onChange={(e) =>
              setMinStr(withThousands(onlyDigits(e.currentTarget.value)))
            }
            showLabel
          />
          <Input
            dir="ltr"
            label="تا قیمت"
            placeholder="0"
            value={maxStr}
            onChange={(e) =>
              setMaxStr(withThousands(onlyDigits(e.currentTarget.value)))
            }
            showLabel
          />
        </div>
      </div>

      <div
        className={s.sheetFooter}
        style={{ display: "flex", gap: 12, alignItems: "center" }}
      >
        <Button
          type="secondary"
          size="large"
          className={s.applyBtn}
          onClick={applyAll}
          aria-label="اعمال فیلتر"
          loading={isApplying}
          disabled={isApplying}
        >
          {isApplying
            ? "در حال اعمال…"
            : `اعمال فیلتر${activeCount > 0 ? ` (${activeCount})` : ""}`}
        </Button>

        {activeCount > 0 && (
          <Button
            type="tertiary"
            style="outline"
            size="large"
            className={s.removeBtn}
            onClick={clearAll}
            aria-label="حذف فیلترها"
          >
            <Trash2 size={24} />
          </Button>
        )}
      </div>
    </BottomSheet>
  );
}
