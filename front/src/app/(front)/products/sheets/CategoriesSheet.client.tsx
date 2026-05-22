"use client";

import { useRouter, useSearchParams } from "next/navigation";
import SectionHeader from "@/components/layout/SectionHeader/SectionHeader";
import Chip from "@/components/ui/Chip/Chip";
import BottomSheet from "@/components/ui/BottomSheet/BottomSheet";

type CategoryItem = { label: string; value: string };

export default function CategoriesSheet({
  isOpen,
  categories,
  title = "دسته‌بندی",
}: {
  isOpen: boolean;
  categories: CategoryItem[];
  title?: string;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const current = sp.get("category") ?? "";

  const closeSheet = () => {
    const usp = new URLSearchParams(sp.toString());
    usp.delete("sheet");
    router.replace(`/products?${usp.toString()}`, { scroll: false });
  };

  function selectAndClose(nextValue?: string) {
    const usp = new URLSearchParams(sp.toString());
    if (nextValue && nextValue.length) usp.set("category", nextValue);
    else usp.delete("category");
    usp.delete("sheet");
    router.replace(`/products?${usp.toString()}`, { scroll: false });
  }

  return (
    <BottomSheet isOpen={isOpen} onClose={closeSheet} ariaLabel={title}>
      <SectionHeader title={title} as="h3" />
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "var(--space-8)",
          paddingTop: "0",
          paddingInline: "var(--space-16)",
          paddingBottom: "var(--space-40)",
        }}
      >
        <Chip
          state={current ? "default" : "active"}
          onClick={() => selectAndClose(undefined)}
        >
          همه دسته‌بندی‌ها
        </Chip>

        {categories.map((c) => (
          <Chip
            key={c.value}
            state={current === c.value ? "active" : "default"}
            onClick={() => selectAndClose(c.value)}
          >
            {c.label}
          </Chip>
        ))}
      </div>
    </BottomSheet>
  );
}
