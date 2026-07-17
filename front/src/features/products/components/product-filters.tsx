"use client";

import {
  useMemo,
  useState,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";
import Image from "next/image";
import {
  ArrowUpDown,
  BadgePercent,
  CalendarDays,
  Filter,
  Grid2X2,
  Trash2,
  Truck,
} from "lucide-react";

import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetHeader,
  BottomSheetTitle,
} from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Divider } from "@/components/ui/divider";
import { Input } from "@/components/ui/input";
import { SegmentSelector } from "@/components/ui/segment-selector";
import { Toggle } from "@/components/ui/toggle";
import { cn } from "@/lib/utils";
import { useProductFilterNavigation } from "../hooks/useProductFilterNavigation";

type CategoryOption = { id: number; name: string; slug: string };
type SortId = "latest" | "oldest" | "popular";

type Occasion = {
  key: "none" | "birthday" | "anniversary" | "newyear" | "yalda" | "graduation" | "valentine" | "parents";
  label: string;
  tags: string[];
  image: string;
};

const occasions: readonly Occasion[] = [
  { key: "parents", label: "روز مادر یا روز پدر", tags: ["motherday", "fatherday"], image: "/images/filters-occasion-mother-father.png" },
  { key: "anniversary", label: "سالگرد ازدواج", tags: ["anniversary"], image: "/images/filters-occasion-anniv.png" },
  { key: "birthday", label: "جشن تولد", tags: ["birthday"], image: "/images/filters-occasion-birthday.png" },
  { key: "none", label: "بدون مناسبت", tags: [], image: "/images/filters-occasion-none.png" },
  { key: "graduation", label: "شروع مسیر جدید", tags: ["graduation"], image: "/images/filters-occasion-grad.png" },
  { key: "newyear", label: "عید نوروز", tags: ["newyear"], image: "/images/filters-occasion-newyear.png" },
  { key: "yalda", label: "شب یلدا", tags: ["yalda"], image: "/images/filters-occasion-yalda.png" },
  { key: "valentine", label: "روز عشق و ولنتاین", tags: ["valentine"], image: "/images/filters-occasion-valentine.png" },
];

const occasionTags = new Set(occasions.flatMap((occasion) => occasion.tags));
const sortItems = [
  { value: "latest", label: "جدیدترین" },
  { value: "oldest", label: "قدیمی‌ترین" },
  { value: "popular", label: "محبوب‌ترین" },
];

function parseTags(value: string | null) {
  return value ? [...new Set(value.split(",").map((tag) => tag.trim()).filter(Boolean))] : [];
}

function joinTags(tags: readonly string[]) {
  return [...new Set(tags)].join(",");
}

function onlyDigits(value: string) {
  return value
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/\D/g, "");
}

function formatPrice(value: string) {
  const digits = onlyDigits(value).replace(/^0+(?=\d)/, "");
  return digits ? new Intl.NumberFormat("fa-IR").format(Number(digits)) : "";
}

function sortFromParams(orderby: string | null, order: string | null): SortId {
  if (orderby === "popularity") return "popular";
  return order === "asc" ? "oldest" : "latest";
}

function sortToParams(sort: SortId) {
  if (sort === "popular") return { orderby: "popularity", order: "desc" };
  if (sort === "oldest") return { orderby: "date", order: "asc" };
  return { orderby: "date", order: "desc" };
}

function selectedOccasion(tags: readonly string[]) {
  return occasions.find(
    (occasion) =>
      occasion.tags.length > 0 &&
      occasion.tags.length === tags.filter((tag) => occasionTags.has(tag)).length &&
      occasion.tags.every((tag) => tags.includes(tag)),
  )?.key ?? "none";
}

function occasionLabel(tags: readonly string[]) {
  const occasion = occasions.find((item) => item.key === selectedOccasion(tags));
  return occasion?.key === "none" ? "مناسبت" : occasion?.label ?? "مناسبت";
}

function priceLabel(min: string | null, max: string | null) {
  if (!min && !max) return "بازه قیمت";
  const number = new Intl.NumberFormat("fa-IR");
  return `از ${min ? number.format(Number(min)) : "۰"} تا ${max ? number.format(Number(max)) : "…"} تومان`;
}

function ChipButton({ children, className, ...props }: ComponentPropsWithoutRef<"button">) {
  return (
    <button
      {...props}
      className={cn("inline-flex cursor-pointer border-0 bg-transparent p-0 text-inherit", className)}
      type="button"
    >
      {children}
    </button>
  );
}

type RemovableFilterChipProps = {
  children: ReactNode;
  leadingIcon: ReactNode;
  onClick: () => void;
  onRemove: () => void;
  removeLabel: string;
};

function RemovableFilterChip({
  children,
  leadingIcon,
  onClick,
  onRemove,
  removeLabel,
}: Readonly<RemovableFilterChipProps>) {
  return (
    <Chip onRemove={onRemove} removeLabel={removeLabel} variant="selected">
      <button
        className="inline-flex cursor-pointer items-center gap-6 border-0 bg-transparent p-0 font-inherit text-inherit focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/30 focus-visible:ring-offset-2"
        onClick={onClick}
        type="button"
      >
        <span
          aria-hidden="true"
          className="inline-flex size-[var(--chip-icon-size)] shrink-0 items-center justify-center [&>svg]:size-full"
        >
          {leadingIcon}
        </span>
        <span>{children}</span>
      </button>
    </Chip>
  );
}

type ProductFiltersProps = { categories: readonly CategoryOption[] };

/** The one PLP interaction boundary: URL-driven chips plus a consolidated filter sheet. */
export function ProductFilters({ categories }: Readonly<ProductFiltersProps>) {
  const { replaceFilters, clearFilters, searchParams } = useProductFilterNavigation();
  const [isOpen, setIsOpen] = useState(false);
  const tags = useMemo(() => parseTags(searchParams.get("tag")), [searchParams]);
  const category = searchParams.get("category") ?? "";
  const minPrice = searchParams.get("min_price");
  const maxPrice = searchParams.get("max_price");
  const sort = sortFromParams(searchParams.get("orderby"), searchParams.get("order"));
  const categoryLabel = categories.find((item) => String(item.id) === category || item.slug === category)?.name ?? "دسته‌بندی";
  const fastDelivery = tags.includes("fast-delivery");
  const activeCount = Number(Boolean(category)) + Number(Boolean(minPrice || maxPrice)) + Number(tags.some((tag) => occasionTags.has(tag))) + Number(fastDelivery);

  const toggleFastDelivery = () => {
    const next = fastDelivery ? tags.filter((tag) => tag !== "fast-delivery") : [...tags, "fast-delivery"];
    replaceFilters({ tag: joinTags(next) || null });
  };

  return (
    <>
      <nav aria-label="فیلتر محصولات" className="overflow-x-auto px-16 py-12 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex w-max items-center gap-8">
          <ChipButton onClick={() => setIsOpen(true)}>
            <Chip badge={activeCount || undefined} leadingIcon={<Filter />} variant={activeCount ? "selected" : "outline"}>
              فیلترها
            </Chip>
          </ChipButton>
          {sort !== "latest" ? (
            <RemovableFilterChip
              leadingIcon={<ArrowUpDown />}
              onClick={() => setIsOpen(true)}
              onRemove={() => replaceFilters({ orderby: null, order: null })}
              removeLabel="حذف مرتب‌سازی"
            >
              {sortItems.find((item) => item.value === sort)?.label}
            </RemovableFilterChip>
          ) : (
            <ChipButton onClick={() => setIsOpen(true)}>
              <Chip leadingIcon={<ArrowUpDown />} selectable variant="selected">
                {sortItems.find((item) => item.value === sort)?.label}
              </Chip>
            </ChipButton>
          )}
          {category ? (
            <RemovableFilterChip
              leadingIcon={<Grid2X2 />}
              onClick={() => setIsOpen(true)}
              onRemove={() => replaceFilters({ category: null })}
              removeLabel="حذف فیلتر دسته‌بندی"
            >
              {categoryLabel}
            </RemovableFilterChip>
          ) : (
            <ChipButton onClick={() => setIsOpen(true)}>
              <Chip leadingIcon={<Grid2X2 />} variant="outline">دسته‌بندی</Chip>
            </ChipButton>
          )}
          {tags.some((tag) => occasionTags.has(tag)) ? (
            <RemovableFilterChip
              leadingIcon={<CalendarDays />}
              onClick={() => setIsOpen(true)}
              onRemove={() => replaceFilters({ tag: joinTags(tags.filter((tag) => !occasionTags.has(tag))) || null })}
              removeLabel="حذف فیلتر مناسبت"
            >
              {occasionLabel(tags)}
            </RemovableFilterChip>
          ) : (
            <ChipButton onClick={() => setIsOpen(true)}>
              <Chip leadingIcon={<CalendarDays />} variant="outline">مناسبت</Chip>
            </ChipButton>
          )}
          {minPrice || maxPrice ? (
            <RemovableFilterChip
              leadingIcon={<BadgePercent />}
              onClick={() => setIsOpen(true)}
              onRemove={() => replaceFilters({ min_price: null, max_price: null })}
              removeLabel="حذف فیلتر بازه قیمت"
            >
              {priceLabel(minPrice, maxPrice)}
            </RemovableFilterChip>
          ) : (
            <ChipButton onClick={() => setIsOpen(true)}>
              <Chip leadingIcon={<BadgePercent />} variant="outline">بازه قیمت</Chip>
            </ChipButton>
          )}
          {fastDelivery ? (
            <RemovableFilterChip
              leadingIcon={<Truck />}
              onClick={toggleFastDelivery}
              onRemove={toggleFastDelivery}
              removeLabel="حذف فیلتر ارسال سریع امروز"
            >
              ارسال سریع امروز
            </RemovableFilterChip>
          ) : (
            <ChipButton onClick={toggleFastDelivery}>
              <Chip leadingIcon={<Truck />} variant="outline">ارسال سریع امروز</Chip>
            </ChipButton>
          )}
        </div>
      </nav>

      {isOpen ? (
        <FiltersSheet
          key={searchParams.toString()}
          categories={categories}
          onClear={() => {
            clearFilters();
            setIsOpen(false);
          }}
          onClose={() => setIsOpen(false)}
          onApply={(filters) => {
            replaceFilters(filters);
            setIsOpen(false);
          }}
          values={{ category, tags, minPrice: minPrice ?? "", maxPrice: maxPrice ?? "", sort }}
        />
      ) : null}
    </>
  );
}

type FiltersSheetProps = {
  categories: readonly CategoryOption[];
  onClose: () => void;
  onClear: () => void;
  onApply: (filters: Record<string, string | null>) => void;
  values: { category: string; tags: readonly string[]; minPrice: string; maxPrice: string; sort: SortId };
};

function FiltersSheet({ categories, onClose, onClear, onApply, values }: Readonly<FiltersSheetProps>) {
  const [category, setCategory] = useState(values.category);
  const [tags, setTags] = useState<string[]>([...values.tags]);
  const [minPrice, setMinPrice] = useState(values.minPrice);
  const [maxPrice, setMaxPrice] = useState(values.maxPrice);
  const [sort, setSort] = useState<SortId>(values.sort);

  const occasion = selectedOccasion(tags);
  const fastDelivery = tags.includes("fast-delivery");
  const activeCount = Number(category !== "") + Number(occasion !== "none") + Number(fastDelivery) + Number(minPrice !== "" || maxPrice !== "") + Number(sort !== "latest");

  const setOccasion = (next: Occasion["key"]) => {
    const nonOccasionTags = tags.filter((tag) => !occasionTags.has(tag));
    const item = occasions.find((current) => current.key === next);
    setTags([...nonOccasionTags, ...(item?.tags ?? [])]);
  };

  const toggleFast = (checked: boolean) => {
    setTags((current) => checked ? [...current.filter((tag) => tag !== "fast-delivery"), "fast-delivery"] : current.filter((tag) => tag !== "fast-delivery"));
  };

  const apply = () => {
    const sortParams = sortToParams(sort);
    onApply({
      category: category || null,
      tag: joinTags(tags) || null,
      min_price: onlyDigits(minPrice) || null,
      max_price: onlyDigits(maxPrice) || null,
      ...sortParams,
    });
  };

  return (
    <BottomSheet open onOpenChange={(open) => !open && onClose()}>
      <BottomSheetContent aria-describedby={undefined} size="md">
        <BottomSheetHeader className="sticky top-0 z-10 flex-row items-center justify-between border-b border-border-low-emphasis bg-surface-background py-16">
          <BottomSheetTitle className="text-title-18 font-bold text-text-primary">فیلترها</BottomSheetTitle>
        </BottomSheetHeader>

        <div className="grid gap-24 px-20 pb-24 [direction:rtl]">
          <section aria-labelledby="sort-heading">
            <h3 id="sort-heading" className="mb-12 text-title-16 font-bold text-text-primary">مرتب‌سازی</h3>
            <SegmentSelector items={sortItems} value={sort} onValueChange={(value) => setSort(value as SortId)} />
          </section>

          <Divider inset />

          <section aria-labelledby="category-heading">
            <h3 id="category-heading" className="mb-12 text-title-16 font-bold text-text-primary">دسته‌بندی</h3>
            <div className="flex flex-wrap gap-8">
              <ChipButton onClick={() => setCategory("")}><Chip size="sm" variant={category ? "outline" : "selected"}>همه دسته‌بندی‌ها</Chip></ChipButton>
              {categories.map((item) => (
                <ChipButton key={item.id} onClick={() => setCategory(String(item.id))}>
                  <Chip size="sm" variant={category === String(item.id) ? "selected" : "outline"}>{item.name}</Chip>
                </ChipButton>
              ))}
            </div>
          </section>

          <Divider inset />

          <section aria-labelledby="delivery-heading">
            <div className="flex items-center justify-between gap-16">
              <div>
                <h3 id="delivery-heading" className="text-title-16 font-bold text-text-primary">ارسال سریع امروز</h3>
                <p className="mt-4 text-label-12 text-text-secondary">فقط هدایای قابل ارسال امروز</p>
              </div>
              <Toggle checked={fastDelivery} onCheckedChange={toggleFast} aria-label="ارسال سریع امروز" />
            </div>
          </section>

          <Divider inset />

          <section aria-labelledby="occasion-heading">
            <h3 id="occasion-heading" className="mb-12 text-title-16 font-bold text-text-primary">مناسبت</h3>
            <div className="grid grid-cols-2 gap-8 min-[540px]:grid-cols-4">
              {occasions.map((item) => {
                const selected = occasion === item.key;
                return (
                  <button
                    key={item.key}
                    aria-pressed={selected}
                    className={cn(
                      "flex flex-col items-center justify-center gap-6 rounded-m border p-8 text-center text-label-12 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary",
                      selected ? "border-secondary bg-secondary-container text-on-secondary-container" : "border-border-low-emphasis bg-surface-background text-text-primary hover:bg-surface",
                    )}
                    onClick={() => setOccasion(item.key)}
                    type="button"
                  >
                    <Image alt="" className="size-48 object-contain" height={48} src={item.image} width={48} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <Divider inset />

          <section aria-labelledby="price-heading">
            <h3 id="price-heading" className="mb-12 text-title-16 font-bold text-text-primary">بازه قیمت</h3>
            <div className="grid grid-cols-2 gap-12">
              <Input dir="ltr" inputMode="numeric" label="از قیمت (تومان)" placeholder="۰" value={minPrice} onChange={(event) => setMinPrice(formatPrice(event.currentTarget.value))} />
              <Input dir="ltr" inputMode="numeric" label="تا قیمت (تومان)" placeholder="۰" value={maxPrice} onChange={(event) => setMaxPrice(formatPrice(event.currentTarget.value))} />
            </div>
          </section>
        </div>

        <div className="sticky bottom-0 flex items-center gap-12 border-t border-border-low-emphasis bg-surface-background p-16">
          {activeCount ? (
            <Button
              aria-label="حذف همه فیلترها"
              className="size-56 shrink-0 px-0"
              onClick={onClear}
              size="large"
              title="حذف همه فیلترها"
              variant="tertiary-outline"
            >
              <Trash2 aria-hidden />
            </Button>
          ) : null}
          <Button className="flex-1" loading={false} onClick={apply} size="large" variant="secondary-filled">
            {activeCount ? `اعمال فیلترها (${activeCount})` : "نمایش محصولات"}
          </Button>
        </div>
      </BottomSheetContent>
    </BottomSheet>
  );
}
