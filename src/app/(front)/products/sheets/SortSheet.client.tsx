"use client";

import { useMemo } from "react";
import {
  useRouter,
  useSearchParams,
  type ReadonlyURLSearchParams,
} from "next/navigation";
import BottomSheet from "@/components/ui/BottomSheet/BottomSheet";
import SectionHeader from "@/components/layout/SectionHeader/SectionHeader";
import SegmentSelector from "@/components/ui/SegmentSelector/SegmentSelector";

type SortId = "latest" | "oldest" | "popular";

type Props = {
  isOpen: boolean;
  onClose?: () => void;
  title?: string;
};

function paramsToSortId(sp: ReadonlyURLSearchParams): SortId {
  const orderby = (sp.get("orderby") || "date").toLowerCase();
  const order = (sp.get("order") || "desc").toLowerCase();
  if (orderby === "popularity") return "popular";
  return order === "asc" ? "oldest" : "latest";
}

function applySortToParams(sp: URLSearchParams, id: SortId) {
  if (id === "popular") {
    sp.set("orderby", "popularity");
    sp.set("order", "desc");
  } else if (id === "oldest") {
    sp.set("orderby", "date");
    sp.set("order", "asc");
  } else {
    sp.set("orderby", "date");
    sp.set("order", "desc");
  }
  sp.set("page", "1");
  sp.delete("sheet");
}

export default function SortSheet({
  isOpen,
  onClose,
  title = "مرتب‌سازی",
}: Props) {
  const router = useRouter();
  const sp = useSearchParams();

  const value = useMemo<SortId>(() => paramsToSortId(sp), [sp]);

  const items = useMemo(
    () => [
      { id: "latest", label: "جدیدترین" },
      { id: "oldest", label: "قدیمی‌ترین" },
      { id: "popular", label: "محبوب‌ترین" },
    ],
    []
  );

  const handleChange = (next: string) => {
    const usp = new URLSearchParams(sp.toString());
    applySortToParams(usp, next as SortId);
    router.replace(`/products?${usp.toString()}`, { scroll: false });
    onClose?.();
  };

  const handleClose = () => {
    const usp = new URLSearchParams(sp.toString());
    usp.delete("sheet");
    router.replace(`/products?${usp.toString()}`, { scroll: false });
    onClose?.();
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={handleClose} ariaLabel={title}>
      <SectionHeader title={title} as="h3" />
      <div style={{ padding: "0 var(--space-16) var(--space-40)" }}>
        <div style={{ width: "100%" }}>
          <SegmentSelector
            items={items}
            value={value}
            onChange={handleChange}
          />
        </div>
      </div>
    </BottomSheet>
  );
}
