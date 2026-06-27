"use client";

/**
 * useAllFilters — filter state for AllFiltersSheet: reads the current URL,
 * keeps local form state in sync while the sheet is open, and writes the
 * applied filters back to the URL. Extracted verbatim (no behavior change).
 */

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  OCCASIONS,
  normTags,
  onlyDigits,
  toInt,
  withThousands,
  type OccasionKey,
  type SortId,
} from "./allFilters.constants";

export function useAllFilters(isOpen: boolean, onClose?: () => void) {
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
        : "latest",
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
    withThousands(onlyDigits(urlMin)),
  );
  const [maxStr, setMaxStr] = useState<string>(
    withThousands(onlyDigits(urlMax)),
  );

  useEffect(() => {
    const oBy = (sp.get("orderby") || "date").toLowerCase();
    const o = (sp.get("order") || "desc").toLowerCase() as "asc" | "desc";
    setSort(
      oBy === "popularity" ? "popular" : o === "asc" ? "oldest" : "latest",
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

  const [isPending, startTransition] = useTransition();

  const applyAll = useCallback(() => {
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

    startTransition(() => {
      router.replace(`/products?${usp.toString()}`, { scroll: false });
    });
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

  return {
    closeSafe,
    sort,
    setSort,
    category,
    setCategory,
    fast,
    setFast,
    occasion,
    setOccasion,
    minStr,
    setMinStr,
    maxStr,
    setMaxStr,
    isPending,
    applyAll,
    clearAll,
    activeCount,
  };
}
