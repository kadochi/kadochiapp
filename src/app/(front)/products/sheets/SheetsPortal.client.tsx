// src/app/(front)/products/sheets/SheetsPortal.client.tsx
"use client";

import { useSearchParams } from "next/navigation";
import CategoriesSheet from "./CategoriesSheet.client";

type CategoryItem = { label: string; value: string };

export default function SheetsPortal({
  categories,
}: {
  categories: CategoryItem[];
}) {
  const sp = useSearchParams();
  const sheet = sp.get("sheet"); // "categories" | "filters" | ...

  if (!sheet) return null;

  switch (sheet) {
    case "categories":
      return (
        <CategoriesSheet
          isOpen={true}
          categories={categories}
          title="دسته‌بندی"
        />
      );

    default:
      return null;
  }
}
