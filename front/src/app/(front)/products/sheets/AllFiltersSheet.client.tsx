"use client";

import BottomSheet from "@/components/ui/BottomSheet/BottomSheet";
import SectionHeader from "@/components/layout/SectionHeader/SectionHeader";
import Divider from "@/components/ui/Divider/Divider";
import Chip from "@/components/ui/Chip/Chip";
import Input from "@/components/ui/Input/Input";
import Button from "@/components/ui/Button/Button";
import Toggle from "@/components/ui/Toggle/Toggle";
import SegmentSelector from "@/components/ui/SegmentSelector/SegmentSelector";
import { X, Trash2 } from "lucide-react";
import s from "./Sheets.module.css";
import {
  OCCASIONS,
  onlyDigits,
  sortItems,
  withThousands,
  type CategoryItem,
  type SortId,
} from "./allFilters.constants";
import { useAllFilters } from "./useAllFilters";

export default function AllFiltersSheet({
  isOpen,
  onClose,
  categories,
}: {
  isOpen: boolean;
  onClose?: () => void;
  categories: CategoryItem[];
}) {
  const {
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
  } = useAllFilters(isOpen, onClose);

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
          loading={isPending}
          disabled={isPending}
        >
          {isPending
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
            fullWidth
          >
            <Trash2 size={24} />
          </Button>
        )}
      </div>
    </BottomSheet>
  );
}
