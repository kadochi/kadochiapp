"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

export type HomepageStory = {
  id: number;
  title: string;
  image: { url: string; alt: string };
  ctaLink: string | null;
  publishedAt: string;
};

type StoriesSectionProps = {
  stories: readonly HomepageStory[];
};

const viewerDurationMs = 5_500;

function elapsedTime(publishedAt: string) {
  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - Date.parse(publishedAt)) / 60_000));
  const number = new Intl.NumberFormat("fa-IR");
  if (elapsedMinutes < 1) return "همین حالا";
  if (elapsedMinutes < 60) return `${number.format(elapsedMinutes)} دقیقه پیش`;

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  return `${number.format(elapsedHours)} ساعت پیش`;
}

/** A persistent editorial story rail and an Instagram-style, keyboard-accessible viewer. */
export function StoriesSection({ stories }: Readonly<StoriesSectionProps>) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loadedStoryId, setLoadedStoryId] = useState<number | null>(null);
  const selectedIndex = selectedId === null ? -1 : stories.findIndex((story) => story.id === selectedId);
  const selectedStory = selectedIndex >= 0 ? stories[selectedIndex] : null;
  const isSelectedImageLoaded = selectedStory?.id === loadedStoryId;

  useEffect(() => {
    if (!selectedStory) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [selectedStory]);

  const showStory = useCallback((index: number) => {
    if (!stories.length) return;
    const normalizedIndex = (index + stories.length) % stories.length;
    setLoadedStoryId(null);
    setSelectedId(stories[normalizedIndex]?.id ?? null);
  }, [stories]);

  useEffect(() => {
    if (!selectedStory || !isSelectedImageLoaded) return;

    const advance = window.setTimeout(() => {
      if (selectedIndex === stories.length - 1) {
        setSelectedId(null);
      } else {
        showStory(selectedIndex + 1);
      }
    }, viewerDurationMs);
    return () => window.clearTimeout(advance);
  }, [isSelectedImageLoaded, stories.length, selectedIndex, selectedStory, showStory]);

  useEffect(() => {
    if (!selectedStory) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedId(null);
      if (event.key === "ArrowLeft") showStory(selectedIndex + 1);
      if (event.key === "ArrowRight") showStory(selectedIndex - 1);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedIndex, selectedStory, showStory]);

  if (!stories.length) return null;

  return (
    <section aria-labelledby="stories-heading" className="bg-surface-background pb-16 pt-24">
      <div className="flex items-center justify-between gap-16 px-16 [direction:rtl] min-[1024px]:px-32">
        <h2 className="m-0 whitespace-nowrap text-title-16 font-bold text-surface-neutral-high-emphasis min-[580px]:text-title-18" id="stories-heading">
          استوری‌ها
        </h2>
        <Button asChild size="small" variant="tertiary-outline">
          <a href="https://instagram.com/kadochicom" rel="noreferrer" target="_blank">
            <Image alt="" height={20} src="/icons/social-instagram.svg" width={20} />
            اینستاگرام کادوچی
          </a>
        </Button>
      </div>

      <div className="mt-16 flex gap-12 overflow-x-auto px-16 pb-4 [direction:rtl] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden min-[1024px]:px-32">
        {stories.map((story, index) => (
          <button
            aria-label={`نمایش استوری ${story.title || index + 1}`}
            className="group grid w-[76px] shrink-0 justify-items-center gap-6 border-0 bg-transparent p-0 font-sans text-label-12 text-surface-neutral-high-emphasis"
            key={story.id}
            onClick={() => {
              setLoadedStoryId(null);
              setSelectedId(story.id);
            }}
            type="button"
          >
            <span className="block h-[76px] w-[76px] shrink-0 aspect-square rounded-full bg-[linear-gradient(135deg,#f9ce34,#ee2a7b_48%,#6228d7)] p-[3px]">
              <span className="block size-full aspect-square rounded-full bg-surface-background p-[3px]">
                <Image
                  alt=""
                  className="block size-full aspect-square rounded-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                  height={64}
                  loading="lazy"
                  sizes="64px"
                  src={story.image.url}
                  width={64}
                />
              </span>
            </span>
            <span className="line-clamp-1 w-full">{story.title || "کادوچی"}</span>
          </button>
        ))}
      </div>

      {selectedStory ? (
        <div aria-label="نمایش استوری کادوچی" aria-modal="true" className="fixed inset-0 z-[110] grid place-items-center bg-black/90 p-0 min-[768px]:p-32" role="dialog">
          <button aria-label="بستن استوری" className="absolute inset-0 cursor-default border-0 bg-transparent" onClick={() => setSelectedId(null)} type="button" />
          <article className="relative isolate h-dvh w-full overflow-hidden bg-black text-white shadow-2xl min-[768px]:h-[min(82dvh,760px)] min-[768px]:w-[min(46.125dvh,428px)] min-[768px]:rounded-xl" dir="rtl">
            <Image
              alt={selectedStory.image.alt || selectedStory.title}
              className="object-cover"
              fill
              key={selectedStory.id}
              onLoad={() => {
                setLoadedStoryId(selectedStory.id);
                void fetch(`/api/stories/${selectedStory.id}/views`, {
                  method: "POST",
                  credentials: "same-origin",
                  keepalive: true,
                }).catch(() => undefined);
              }}
              sizes="(min-width: 768px) 428px, 100vw"
              src={selectedStory.image.url}
            />
            <span className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,.56),transparent_26%,transparent_72%,rgba(0,0,0,.32))]" />

            <div className="absolute inset-x-0 top-0 z-20 p-16">
              <div aria-hidden className="flex gap-4 [direction:ltr]">
                {stories.map((story, index) => (
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-white/35" key={story.id}>
                    <span
                      className={index === selectedIndex && isSelectedImageLoaded ? "story-viewer-progress block h-full bg-white" : "block h-full origin-left bg-white"}
                      key={`${story.id}-${selectedStory.id}`}
                      style={{ transform: index < selectedIndex ? "scaleX(1)" : index > selectedIndex || !isSelectedImageLoaded ? "scaleX(0)" : undefined }}
                    />
                  </span>
                ))}
              </div>

              <div className="mt-16 flex items-start justify-between gap-12 [direction:rtl]">
                <button aria-label="بستن استوری" className="flex size-24 shrink-0 items-center justify-center border-0 bg-transparent p-0 text-white hover:opacity-75" onClick={() => setSelectedId(null)} type="button">
                  <X aria-hidden className="size-24" />
                </button>
                <div className="flex min-w-0 flex-1 items-center gap-8 [direction:ltr]">
                  <Image alt="کادوچی" className="block size-64 shrink-0 object-contain" height={64} src="/images/logo.svg" width={64} />
                  <div className="grid min-w-0 gap-1 text-left">
                    <strong className="text-label-14">Kadochi</strong>
                    <span className="text-label-12 text-white/80 [direction:rtl]">{elapsedTime(selectedStory.publishedAt)}</span>
                  </div>
                </div>
              </div>
            </div>

            {selectedStory.ctaLink ? (
              <a className="absolute bottom-[56px] left-1/2 z-20 inline-flex -translate-x-1/2 items-center gap-4 rounded-rounded bg-white px-20 py-12 text-label-14 font-bold text-surface-neutral-high-emphasis shadow-lg transition-opacity hover:opacity-90" href={selectedStory.ctaLink}>
                مشاهده
                <ChevronLeft aria-hidden className="size-18" />
              </a>
            ) : null}

            <button aria-label="استوری قبلی" className="absolute bottom-0 left-0 top-0 z-10 w-1/3 cursor-w-resize border-0 bg-transparent" onClick={() => showStory(selectedIndex - 1)} type="button" />
            <button aria-label="استوری بعدی" className="absolute bottom-0 right-0 top-0 z-10 w-1/3 cursor-e-resize border-0 bg-transparent" onClick={() => showStory(selectedIndex + 1)} type="button" />
            <div className="pointer-events-none absolute inset-x-0 top-1/2 z-10 hidden -translate-y-1/2 justify-between px-12 min-[768px]:flex" dir="ltr">
              <ChevronLeft aria-hidden className="size-28 text-white/75" />
              <ChevronRight aria-hidden className="size-28 text-white/75" />
            </div>
          </article>
        </div>
      ) : null}
    </section>
  );
}
