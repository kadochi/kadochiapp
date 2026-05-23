"use client";

import {
  useRouter,
  useSearchParams,
  type ReadonlyURLSearchParams,
} from "next/navigation";
import { useTransition } from "react";
import Chip from "@/components/ui/Chip/Chip";
import {
  Filter,
  ChevronDown,
  Grid2x2,
  BadgePercent,
  Truck,
  X,
  ArrowUpDown,
  Calendar,
} from "lucide-react";
import s from "../products.module.css";

/* ---- helpers ---- */
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

function parseTags(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}
function joinTags(tags: string[]) {
  return Array.from(new Set(tags)).join(",");
}

function getSortId(
  sp: ReadonlyURLSearchParams
): "latest" | "oldest" | "popular" {
  const orderby = (sp.get("orderby") || "date").toLowerCase();
  const order = (sp.get("order") || "desc").toLowerCase();
  if (orderby === "popularity") return "popular";
  return order === "asc" ? "oldest" : "latest";
}

export default function FiltersBar({
  categoryLabel,
}: {
  categoryLabel?: string | null;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const isCategoryActive = !!sp.get("category");
  const categoryText = isCategoryActive
    ? categoryLabel || "دسته‌بندی"
    : "دسته‌بندی";

  const sortId = getSortId(sp);
  const sortText =
    sortId === "popular"
      ? "محبوب‌ترین"
      : sortId === "oldest"
      ? "قدیمی‌ترین"
      : "جدیدترین";

  const min = sp.get("min_price");
  const max = sp.get("max_price");
  const isPriceActive = !!(min || max);
  const fnum = (n: string | number) => Number(n).toLocaleString("fa-IR");
  const priceText = isPriceActive
    ? `از ${min ? fnum(min) : "۰"} تومان تا ${max ? fnum(max) : "…"} تومان`
    : "بازه قیمت";

  const tagParam = sp.get("tag") || "";
  const allTags = parseTags(tagParam);
  const hasFastDelivery = allTags.includes("fast-delivery");

  const occTags = allTags.filter((t) => OCC_SET.has(t));
  const hasOccasion =
    new Set(occTags).has("motherday") && new Set(occTags).has("fatherday")
      ? true
      : occTags.length >= 1;

  const isOccasionActive = hasOccasion;

  const occasionMap: Record<string, string> = {
    birthday: "جشن تولد",
    anniversary: "سالگرد ازدواج",
    valentine: "روز عشق و ولنتاین",
    newyear: "عید نوروز",
    yalda: "شب یلدا",
    graduation: "شروع مسیر جدید",
    fatherday: "روز پدر",
    motherday: "روز مادر",
  };

  let occasionText = "مناسبت";
  if (isOccasionActive) {
    const sset = new Set(occTags);
    if (sset.has("motherday") && sset.has("fatherday") && sset.size === 2) {
      occasionText = "روز مادر یا روز پدر";
    } else if (occTags.length === 1 && occasionMap[occTags[0]]) {
      occasionText = occasionMap[occTags[0]];
    } else {
      occasionText = "مناسبت";
    }
  }

  const activeFiltersCount =
    (isCategoryActive ? 1 : 0) +
    (isPriceActive ? 1 : 0) +
    (hasOccasion ? 1 : 0) +
    (hasFastDelivery ? 1 : 0);

  const openSheet = (name: string) => {
    const usp = new URLSearchParams(sp.toString());
    usp.set("sheet", name);
    startTransition(() => {
      router.replace(`/products?${usp.toString()}`, { scroll: false });
    });
  };

  const clearCategory = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    const usp = new URLSearchParams(sp.toString());
    usp.delete("category");
    usp.delete("sheet");
    usp.delete("page");
    startTransition(() => {
      router.replace(`/products?${usp.toString()}`, { scroll: false });
    });
  };

  const clearPrice = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    const usp = new URLSearchParams(sp.toString());
    usp.delete("min_price");
    usp.delete("max_price");
    usp.delete("sheet");
    usp.set("page", "1");
    startTransition(() => {
      router.replace(`/products?${usp.toString()}`, { scroll: false });
    });
  };

  const clearOccasion = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    const remaining = allTags.filter((t) => !OCC_SET.has(t));
    const usp = new URLSearchParams(sp.toString());
    if (remaining.length) usp.set("tag", joinTags(remaining));
    else usp.delete("tag");
    usp.delete("sheet");
    usp.set("page", "1");
    startTransition(() => {
      router.replace(`/products?${usp.toString()}`, { scroll: false });
    });
  };

  const toggleFastDelivery = () => {
    const usp = new URLSearchParams(sp.toString());
    const tags = parseTags(usp.get("tag"));
    if (tags.includes("fast-delivery")) {
      const next = tags.filter((t) => t !== "fast-delivery");
      if (next.length) usp.set("tag", joinTags(next));
      else usp.delete("tag");
    } else {
      usp.set("tag", joinTags([...tags, "fast-delivery"]));
    }
    usp.delete("sheet");
    usp.set("page", "1");
    startTransition(() => {
      router.replace(`/products?${usp.toString()}`, { scroll: false });
    });
  };

  return (
    <nav
      className={s.scrollArea}
      aria-label="فیلترها"
      aria-busy={isPending || undefined}
    >
      <Chip
        state={activeFiltersCount > 0 ? "active" : "default"}
        leadingIcon={<Filter size={16} />}
        leadingBadge={activeFiltersCount > 0 ? activeFiltersCount : undefined}
        onClick={() => openSheet("filters")}
      >
        فیلترها
      </Chip>

      <Chip
        state="active"
        leadingIcon={<ArrowUpDown size={16} />}
        trailingIcon={<ChevronDown size={16} />}
        onClick={() => openSheet("sort")}
      >
        {sortText}
      </Chip>

      <Chip
        state={isCategoryActive ? "active" : "default"}
        leadingIcon={<Grid2x2 size={16} />}
        trailingIcon={
          isCategoryActive ? (
            <span
              onClick={clearCategory}
              role="img"
              aria-label="حذف فیلتر دسته‌بندی"
              style={{
                display: "inline-flex",
                lineHeight: 0,
                cursor: "pointer",
              }}
            >
              <X size={16} />
            </span>
          ) : undefined
        }
        onClick={() => openSheet("categories")}
      >
        {categoryText}
      </Chip>

      <Chip
        state={isOccasionActive ? "active" : "default"}
        leadingIcon={<Calendar size={16} />}
        trailingIcon={
          isOccasionActive ? (
            <span
              onClick={clearOccasion}
              role="img"
              aria-label="حذف فیلتر مناسبت"
              style={{
                display: "inline-flex",
                lineHeight: 0,
                cursor: "pointer",
              }}
            >
              <X size={16} />
            </span>
          ) : undefined
        }
        onClick={() => openSheet("occasions")}
      >
        {occasionText}
      </Chip>

      <Chip
        state={isPriceActive ? "active" : "default"}
        leadingIcon={<BadgePercent size={16} />}
        trailingIcon={
          isPriceActive ? (
            <span
              onClick={clearPrice}
              role="img"
              aria-label="حذف فیلتر قیمت"
              style={{
                display: "inline-flex",
                lineHeight: 0,
                cursor: "pointer",
              }}
            >
              <X size={16} />
            </span>
          ) : undefined
        }
        onClick={() => openSheet("price")}
      >
        {priceText}
      </Chip>

      <Chip
        state={hasFastDelivery ? "active" : "default"}
        leadingIcon={<Truck size={16} />}
        onClick={toggleFastDelivery}
      >
        ارسال سریع امروز
      </Chip>
    </nav>
  );
}
