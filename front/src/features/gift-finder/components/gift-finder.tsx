"use client";

/* eslint-disable @next/next/no-img-element -- Artwork comes from supplied local assets or Store API category images. */

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";

import { Button } from "@/components/ui/button";

type GiftFinderOption = {
  id: string;
  imageUrl?: string;
  label: string;
  description?: string;
};

type TagOption = GiftFinderOption & { tagSlugs: string[] };
type CategoryOption = GiftFinderOption & { slug: string };

type GiftFinderProps = {
  recipientOptions: TagOption[];
  occasionOptions: TagOption[];
  categoryOptions: CategoryOption[];
};

const stepCopy = [
  { empty: "برچسب گیرنده‌ای برای نمایش وجود ندارد.", title: "برای چه کسی؟" },
  { empty: "برچسب مناسبتی برای نمایش وجود ندارد.", title: "برای چه مناسبتی؟" },
  { empty: "دسته‌بندی‌ای برای نمایش وجود ندارد.", title: "چه محصولی؟" },
];

function GiftCard({ option, selected, onSelect }: { option: GiftFinderOption; selected: boolean; onSelect: () => void }) {
  return (
    <button
      aria-pressed={selected}
      className="group relative block h-[188px] w-full overflow-hidden rounded-xl bg-[linear-gradient(145deg,var(--color-secondary-gradient),var(--color-secondary))] text-center shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 min-[864px]:h-[220px]"
      type="button"
      onClick={onSelect}
    >
      <span className="absolute inset-x-8 top-16 z-10 grid gap-2 px-4 text-on-secondary">
        <strong className="line-clamp-1 text-label-14 font-bold leading-[var(--text-label-14--line-height)]">{option.label}</strong>
        {option.description ? <span className="line-clamp-1 text-label-10 leading-[var(--text-label-10--line-height)] text-secondary-container">{option.description}</span> : null}
      </span>
      {option.imageUrl ? <img alt="" className="absolute inset-x-0 bottom-0 mx-auto h-[132px] w-full object-contain px-8 transition-transform duration-300 group-hover:scale-105 min-[864px]:h-[158px]" src={option.imageUrl} /> : null}
      {selected ? <span aria-hidden className="absolute inset-0 bg-[rgb(47_0_68_/_0.42)]" /> : null}
    </button>
  );
}

function OptionRail({ options, selectedId, onSelect }: { options: readonly GiftFinderOption[]; selectedId?: string; onSelect: (option: GiftFinderOption) => void }) {
  return (
    <Swiper
      breakpoints={{
        0: { slidesOffsetAfter: 16, slidesOffsetBefore: 16, slidesPerView: 1.4 },
        320: { slidesOffsetAfter: 16, slidesOffsetBefore: 16, slidesPerView: 2.4 },
        540: { slidesOffsetAfter: 16, slidesOffsetBefore: 16, slidesPerView: 3.4 },
        700: { slidesOffsetAfter: 16, slidesOffsetBefore: 16, slidesPerView: 4.4 },
        860: { slidesOffsetAfter: 16, slidesOffsetBefore: 16, slidesPerView: 5.4 },
        1024: { allowTouchMove: false, slidesOffsetAfter: 0, slidesOffsetBefore: 0, slidesPerView: 8 },
      }}
      className="carousel-rail carousel-rail--categories min-[1024px]:px-16"
      dir="rtl"
      spaceBetween={12}
      watchOverflow
    >
      {options.map((option) => (
        <SwiperSlide className="h-auto" key={option.id}>
          <GiftCard option={option} selected={option.id === selectedId} onSelect={() => onSelect(option)} />
        </SwiperSlide>
      ))}
    </Swiper>
  );
}

/** A three-step path that keeps choices editable until the customer starts the filtered search. */
export function GiftFinder({ recipientOptions, occasionOptions, categoryOptions }: Readonly<GiftFinderProps>) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [recipient, setRecipient] = useState<TagOption>();
  const [occasion, setOccasion] = useState<TagOption>();
  const [category, setCategory] = useState<CategoryOption>();
  const options = [recipientOptions, occasionOptions, categoryOptions] as const;
  const activeOptions = options[step];
  const copy = stepCopy[step];

  function selectRecipient(option: GiftFinderOption) {
    setRecipient(option as TagOption);
    setStep(1);
  }

  function selectOccasion(option: GiftFinderOption) {
    setOccasion(option as TagOption);
    setStep(2);
  }

  function selectCategory(option: GiftFinderOption) {
    setCategory(option as CategoryOption);
  }

  function searchGifts() {
    if (!recipient || !occasion || !category) return;
    const tags = [...recipient.tagSlugs, ...occasion.tagSlugs];
    const params = new URLSearchParams({ category: category.slug });
    if (tags.length) params.set("tag", [...new Set(tags)].join(","));
    router.push(`/products?${params.toString()}`);
  }

  const selectOption = step === 0 ? selectRecipient : step === 1 ? selectOccasion : selectCategory;
  const selectedId = step === 0 ? recipient?.id : step === 1 ? occasion?.id : category?.id;

  return (
    <section aria-labelledby="gift-finder-title" className="min-h-[calc(100dvh-var(--spacing-88))] bg-surface-background pb-[172px] pt-48" dir="rtl">
      <div className="text-center">
        <h1 id="gift-finder-title" className="text-heading-24 font-extrabold leading-[var(--text-heading-24--line-height)] text-secondary">
          جستجوی کادو
        </h1>
        <p className="mt-2 text-label-12 text-surface-neutral-mid-emphasis">پیدا کردن کادوی مناسب</p>
      </div>

      <div className="mx-auto mt-56 max-w-[1440px]">
        <h2 className="px-16 text-center text-heading-18 font-extrabold leading-[var(--text-heading-18--line-height)] text-surface-neutral-high-emphasis">{copy.title}</h2>
        <div className="mt-24">
          {activeOptions.length ? (
            <OptionRail options={activeOptions} selectedId={selectedId} onSelect={selectOption} />
          ) : (
            <p className="px-16 text-center text-body-14 text-surface-neutral-mid-emphasis">{copy.empty}</p>
          )}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border-low-emphasis bg-surface-background" dir="rtl">
        <div aria-label="انتخاب‌های شما" className="flex h-88 items-center justify-center gap-8 px-16">
          {recipient ? <SelectionBadge onClick={() => setStep(0)} option={recipient} /> : null}
          {recipient && occasion ? <span aria-hidden className="text-title-16 font-bold text-surface-neutral-high-emphasis">+</span> : null}
          {occasion ? <SelectionBadge onClick={() => setStep(1)} option={occasion} /> : null}
          {occasion && category ? <span aria-hidden className="text-title-16 font-bold text-surface-neutral-high-emphasis">+</span> : null}
          {category ? <SelectionBadge onClick={() => setStep(2)} option={category} /> : null}
        </div>
        <div className="border-t border-border-low-emphasis px-16 py-12 pb-[max(var(--spacing-20),env(safe-area-inset-bottom))]">
          <div className="mx-auto max-w-[580px]">
            <Button className="w-full" disabled={!recipient || !occasion || !category} size="large" variant="secondary-filled" onClick={searchGifts}>
              جستجوی کادو
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function SelectionBadge({ option, onClick }: { option: GiftFinderOption; onClick: () => void }) {
  return (
    <button
      aria-label={`ویرایش انتخاب ${option.label}`}
      className="grid size-64 place-items-center overflow-hidden rounded-rounded bg-[linear-gradient(145deg,var(--color-secondary-gradient),var(--color-secondary))] p-4 shadow-sm transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2"
      type="button"
      onClick={onClick}
    >
      {option.imageUrl ? <img alt="" className="size-full object-contain" src={option.imageUrl} /> : <span className="text-label-10 text-on-secondary">{option.label}</span>}
    </button>
  );
}
