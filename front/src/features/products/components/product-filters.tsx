"use client";

import {
  useEffect,
  useMemo,
  useRef,
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
import { AnimatedProductSearch } from "./product-search";

type CategoryOption = { id: number; name: string; slug: string };
type SortId = "latest" | "oldest" | "popular";
type FilterSheetView = "all" | "sort" | "category" | "occasion" | "price";

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
  const [sheetView, setSheetView] = useState<FilterSheetView | null>(null);
  const [isSearchVisible, setIsSearchVisible] = useState(true);
  const previousScrollY = useRef(0);
  const searchVisibility = useRef(true);
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

  const clearSheetFilters = () => {
    clearFilters();
    setSheetView(null);
  };

  useEffect(() => {
    let frame: number | undefined;
    let settleTimer: number | undefined;
    let isTransitioning = false;

    const setSearchVisibility = (visible: boolean) => {
      if (visible === searchVisibility.current) return;

      searchVisibility.current = visible;
      isTransitioning = true;
      setIsSearchVisible(visible);
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(() => {
        // Collapsing the sticky area can emit a scroll event of its own. Reset
        // the baseline after the transition so that event cannot reverse it.
        previousScrollY.current = window.scrollY;
        isTransitioning = false;
      }, 220);
    };

    const updateSearchVisibility = () => {
      const currentScrollY = window.scrollY;

      if (isTransitioning) {
        previousScrollY.current = currentScrollY;
        frame = undefined;
        return;
      }

      const scrollDelta = currentScrollY - previousScrollY.current;
      let nextVisibility: boolean | undefined;

      if (currentScrollY <= 8) {
        nextVisibility = true;
      } else if (scrollDelta >= 8) {
        nextVisibility = false;
      } else if (scrollDelta <= -8) {
        nextVisibility = true;
      }

      if (nextVisibility !== undefined) {
        previousScrollY.current = currentScrollY;
        setSearchVisibility(nextVisibility);
      }

      frame = undefined;
    };

    const handleScroll = () => {
      if (frame === undefined) frame = window.requestAnimationFrame(updateSearchVisibility);
    };

    previousScrollY.current = window.scrollY;
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (frame !== undefined) window.cancelAnimationFrame(frame);
      window.clearTimeout(settleTimer);
    };
  }, []);

  return (
    <>
      <div className="sticky top-88 z-40 bg-surface-background min-[864px]:top-[124px]">
        <div
          aria-hidden={!isSearchVisible}
          className={cn(
            "grid overflow-hidden [overflow-anchor:none] transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none",
            isSearchVisible ? "grid-rows-[1fr] opacity-100" : "pointer-events-none grid-rows-[0fr] opacity-0",
          )}
          inert={!isSearchVisible}
        >
          <div className="min-h-0 overflow-hidden min-[864px]:hidden">
            <div className="px-16 pb-4 pt-16">
              <AnimatedProductSearch />
            </div>
          </div>
        </div>
        <nav aria-label="فیلتر محصولات" className="overflow-x-auto px-16 py-12 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex w-max items-center gap-8">
          <ChipButton onClick={() => setSheetView("all")}>
            <Chip badge={activeCount || undefined} leadingIcon={<Filter />} variant={activeCount ? "selected" : "outline"}>
              فیلترها
            </Chip>
          </ChipButton>
          {sort !== "latest" ? (
            <RemovableFilterChip
              leadingIcon={<ArrowUpDown />}
              onClick={() => setSheetView("sort")}
              onRemove={() => replaceFilters({ orderby: null, order: null })}
              removeLabel="حذف مرتب‌سازی"
            >
              {sortItems.find((item) => item.value === sort)?.label}
            </RemovableFilterChip>
          ) : (
            <ChipButton onClick={() => setSheetView("sort")}>
              <Chip leadingIcon={<ArrowUpDown />} selectable variant="selected">
                {sortItems.find((item) => item.value === sort)?.label}
              </Chip>
            </ChipButton>
          )}
          {category ? (
            <RemovableFilterChip
              leadingIcon={<Grid2X2 />}
              onClick={() => setSheetView("category")}
              onRemove={() => replaceFilters({ category: null })}
              removeLabel="حذف فیلتر دسته‌بندی"
            >
              {categoryLabel}
            </RemovableFilterChip>
          ) : (
            <ChipButton onClick={() => setSheetView("category")}>
              <Chip leadingIcon={<Grid2X2 />} variant="outline">دسته‌بندی</Chip>
            </ChipButton>
          )}
          {tags.some((tag) => occasionTags.has(tag)) ? (
            <RemovableFilterChip
              leadingIcon={<CalendarDays />}
              onClick={() => setSheetView("occasion")}
              onRemove={() => replaceFilters({ tag: joinTags(tags.filter((tag) => !occasionTags.has(tag))) || null })}
              removeLabel="حذف فیلتر مناسبت"
            >
              {occasionLabel(tags)}
            </RemovableFilterChip>
          ) : (
            <ChipButton onClick={() => setSheetView("occasion")}>
              <Chip leadingIcon={<CalendarDays />} variant="outline">مناسبت</Chip>
            </ChipButton>
          )}
          {minPrice || maxPrice ? (
            <RemovableFilterChip
              leadingIcon={<BadgePercent />}
              onClick={() => setSheetView("price")}
              onRemove={() => replaceFilters({ min_price: null, max_price: null })}
              removeLabel="حذف فیلتر بازه قیمت"
            >
              {priceLabel(minPrice, maxPrice)}
            </RemovableFilterChip>
          ) : (
            <ChipButton onClick={() => setSheetView("price")}>
              <Chip leadingIcon={<BadgePercent />} variant="outline">بازه قیمت</Chip>
            </ChipButton>
          )}
          <ChipButton aria-pressed={fastDelivery} onClick={toggleFastDelivery}>
            <Chip leadingIcon={<Truck />} variant={fastDelivery ? "selected" : "outline"}>
              ارسال فوری
            </Chip>
          </ChipButton>
          </div>
        </nav>
      </div>

      {sheetView ? (
        <FiltersSheet
          key={searchParams.toString()}
          categories={categories}
          onClear={clearSheetFilters}
          onClose={() => setSheetView(null)}
          onApply={replaceFilters}
          values={{ category, tags, minPrice: minPrice ?? "", maxPrice: maxPrice ?? "", sort }}
          view={sheetView}
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
  view: FilterSheetView;
};

function FilterSectionDivider() {
  return (
    <>
      <Divider className="lg:hidden" size="md" variant="spacer" />
      <Divider className="hidden lg:block" inset />
    </>
  );
}

function FiltersSheet({ categories, onClose, onClear, onApply, values, view }: Readonly<FiltersSheetProps>) {
  const [category, setCategory] = useState(values.category);
  const [tags, setTags] = useState<string[]>([...values.tags]);
  const [minPrice, setMinPrice] = useState(values.minPrice);
  const [maxPrice, setMaxPrice] = useState(values.maxPrice);
  const [sort, setSort] = useState<SortId>(values.sort);

  const occasion = selectedOccasion(tags);
  const fastDelivery = tags.includes("fast-delivery");
  const allActiveCount = Number(category !== "") + Number(occasion !== "none") + Number(fastDelivery) + Number(minPrice !== "" || maxPrice !== "") + Number(sort !== "latest");

  const applyIndividualFilter = (filters: Record<string, string | null>) => {
    if (view !== "all" && view !== "price") {
      onApply(filters);
      onClose();
    }
  };

  const setOccasion = (next: Occasion["key"]) => {
    const nonOccasionTags = tags.filter((tag) => !occasionTags.has(tag));
    const item = occasions.find((current) => current.key === next);
    const nextTags = [...nonOccasionTags, ...(item?.tags ?? [])];
    setTags(nextTags);
    applyIndividualFilter({ tag: joinTags(nextTags) || null });
  };

  const apply = () => {
    if (view === "price") {
      onApply({
        min_price: onlyDigits(minPrice) || null,
        max_price: onlyDigits(maxPrice) || null,
      });
      onClose();
      return;
    }

    const sortParams = sortToParams(sort);
    onApply({
      category: category || null,
      tag: joinTags(tags) || null,
      min_price: onlyDigits(minPrice) || null,
      max_price: onlyDigits(maxPrice) || null,
      ...sortParams,
    });
    onClose();
  };

  const sheetTitle = {
    all: "فیلترها",
    sort: "مرتب‌سازی",
    category: "دسته‌بندی",
    occasion: "مناسبت",
    price: "بازه قیمت",
  }[view];

  const clearLabel = "حذف همه فیلترها";

  return (
    <BottomSheet open onOpenChange={(open) => !open && onClose()}>
      <BottomSheetContent
        aria-describedby={undefined}
        footer={view === "all" || view === "price" ? (
          <div className="flex items-center gap-12 border-t border-border-low-emphasis bg-surface-background p-16 pb-[max(env(safe-area-inset-bottom),var(--spacing-24))]">
            {view === "all" && allActiveCount ? (
              <Button
                aria-label={clearLabel}
                className="size-56 shrink-0 px-0"
                onClick={onClear}
                size="large"
                title={clearLabel}
                variant="tertiary-outline"
              >
                <Trash2 aria-hidden />
              </Button>
            ) : null}
            <Button className="flex-1" loading={false} onClick={apply} size="large" variant="secondary-filled">
              {view === "price" ? "اعمال بازه قیمت" : allActiveCount ? `اعمال فیلترها (${allActiveCount})` : "نمایش محصولات"}
            </Button>
          </div>
        ) : undefined}
        size="md"
      >
        <BottomSheetHeader className="sticky top-0 z-10 flex-row items-center justify-between border-b border-border-low-emphasis bg-surface-background py-16">
          <BottomSheetTitle className="text-title-18 font-bold text-text-primary">{sheetTitle}</BottomSheetTitle>
        </BottomSheetHeader>

        <div className="grid gap-16 py-16 [direction:rtl]">
          {view === "all" || view === "sort" ? (
            <section aria-labelledby={view === "all" ? "sort-heading" : undefined} className="px-20 py-8">
              {view === "all" ? <h3 id="sort-heading" className="mb-12 text-title-16 font-bold text-text-primary">مرتب‌سازی</h3> : null}
              <SegmentSelector
                items={sortItems}
                value={sort}
                onValueChange={(value) => {
                  const nextSort = value as SortId;
                  setSort(nextSort);
                  applyIndividualFilter(sortToParams(nextSort));
                }}
              />
            </section>
          ) : null}

          {view === "all" ? <FilterSectionDivider /> : null}

          {view === "all" || view === "category" ? (
            <section aria-labelledby={view === "all" ? "category-heading" : undefined} className="px-20 py-8">
              {view === "all" ? <h3 id="category-heading" className="mb-12 text-title-16 font-bold text-text-primary">دسته‌بندی</h3> : null}
              <div className="flex flex-wrap gap-8">
                <ChipButton
                  onClick={() => {
                    setCategory("");
                    applyIndividualFilter({ category: null });
                  }}
                >
                  <Chip size="md" variant={category ? "outline" : "selected"}>همه دسته‌بندی‌ها</Chip>
                </ChipButton>
                {categories.map((item) => (
                  <ChipButton
                    key={item.id}
                    onClick={() => {
                      const nextCategory = item.slug;
                      setCategory(nextCategory);
                      applyIndividualFilter({ category: nextCategory });
                    }}
                  >
                    <Chip
                      size="md"
                      variant={category === item.slug || category === String(item.id) ? "selected" : "outline"}
                    >
                      {item.name}
                    </Chip>
                  </ChipButton>
                ))}
              </div>
            </section>
          ) : null}

          {view === "all" ? <FilterSectionDivider /> : null}

          {view === "all" || view === "occasion" ? (
            <section aria-labelledby={view === "all" ? "occasion-heading" : undefined} className="px-20 py-8">
              {view === "all" ? <h3 id="occasion-heading" className="mb-12 text-title-16 font-bold text-text-primary">مناسبت</h3> : null}
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
          ) : null}

          {view === "all" ? <FilterSectionDivider /> : null}

          {view === "all" ? (
            <section aria-labelledby="fast-delivery-heading" className="flex items-center justify-between gap-16 px-20 py-8">
              <h3 id="fast-delivery-heading" className="text-title-16 font-bold text-text-primary">ارسال فوری</h3>
              <Toggle
                aria-label="ارسال فوری"
                checked={fastDelivery}
                onCheckedChange={(checked) => {
                  setTags((current) => checked
                    ? [...current.filter((tag) => tag !== "fast-delivery"), "fast-delivery"]
                    : current.filter((tag) => tag !== "fast-delivery"));
                }}
              />
            </section>
          ) : null}

          {view === "all" ? <FilterSectionDivider /> : null}

          {view === "all" || view === "price" ? (
            <section aria-labelledby={view === "all" ? "price-heading" : undefined} className="px-20 py-8">
              {view === "all" ? <h3 id="price-heading" className="mb-12 text-title-16 font-bold text-text-primary">بازه قیمت</h3> : null}
              <div className="grid grid-cols-2 gap-12">
                <Input
                  dir="ltr"
                  inputMode="numeric"
                  label="از قیمت (تومان)"
                  placeholder="۰"
                  value={minPrice}
                  onChange={(event) => {
                    const nextMinPrice = formatPrice(event.currentTarget.value);
                    setMinPrice(nextMinPrice);
                  }}
                />
                <Input
                  dir="ltr"
                  inputMode="numeric"
                  label="تا قیمت (تومان)"
                  placeholder="۰"
                  value={maxPrice}
                  onChange={(event) => {
                    const nextMaxPrice = formatPrice(event.currentTarget.value);
                    setMaxPrice(nextMaxPrice);
                  }}
                />
              </div>
            </section>
          ) : null}
        </div>

      </BottomSheetContent>
    </BottomSheet>
  );
}
