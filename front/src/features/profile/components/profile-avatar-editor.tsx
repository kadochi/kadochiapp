"use client";

/* eslint-disable @next/next/no-img-element -- The editor previews a local blob before it is uploaded. */

import { Camera, Pencil, Trash2, Upload, ZoomIn } from "lucide-react";
import { useEffect, useRef, useState, type ChangeEvent, type PointerEvent } from "react";

import { Avatar } from "@/components/ui/avatar";
import { BottomSheet, BottomSheetContent, BottomSheetDescription, BottomSheetHeader, BottomSheetTitle } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";

const EDITOR_SIZE = 256;
const OUTPUT_SIZE = 512;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

type Crop = {
  source: string;
  width: number;
  height: number;
  minScale: number;
  scale: number;
  x: number;
  y: number;
};

type ProfileAvatarEditorProps = {
  alt: string;
  initialSrc?: string | null;
  onChange: (avatarData: string | null) => void;
  onError: (message: string) => void;
};

function imageSize(source: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new Error("The selected file could not be read."));
    image.src = source;
  });
}

function constrainCrop(crop: Crop, next: Pick<Crop, "scale" | "x" | "y">): Crop {
  const scale = Math.max(crop.minScale, Math.min(crop.minScale * 4, next.scale));
  const maxX = Math.max(0, (crop.width * scale - EDITOR_SIZE) / 2);
  const maxY = Math.max(0, (crop.height * scale - EDITOR_SIZE) / 2);
  return {
    ...crop,
    scale,
    x: Math.max(-maxX, Math.min(maxX, next.x)),
    y: Math.max(-maxY, Math.min(maxY, next.y)),
  };
}

async function renderAvatar(crop: Crop): Promise<string> {
  const image = new Image();
  image.src = crop.source;
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("The selected file could not be read."));
  });

  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Avatar canvas is unavailable.");

  const ratio = OUTPUT_SIZE / EDITOR_SIZE;
  const width = crop.width * crop.scale * ratio;
  const height = crop.height * crop.scale * ratio;
  context.drawImage(image, (OUTPUT_SIZE - width) / 2 + crop.x * ratio, (OUTPUT_SIZE - height) / 2 + crop.y * ratio, width, height);
  return canvas.toDataURL("image/jpeg", 0.9);
}

export function ProfileAvatarEditor({ alt, initialSrc, onChange, onError }: ProfileAvatarEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<{ pointerId: number; x: number; y: number } | null>(null);
  const [preview, setPreview] = useState<string | null>(initialSrc ?? null);
  const [crop, setCrop] = useState<Crop | null>(null);
  const [isRendering, setIsRendering] = useState(false);

  useEffect(() => () => {
    if (crop?.source.startsWith("blob:")) URL.revokeObjectURL(crop.source);
  }, [crop?.source]);

  async function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      onError("لطفاً یک فایل تصویری انتخاب کنید.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      onError("حجم تصویر باید کمتر از ۱۰ مگابایت باشد.");
      return;
    }

    const source = URL.createObjectURL(file);
    try {
      const { width, height } = await imageSize(source);
      if (!width || !height) throw new Error("Empty image");
      const minScale = Math.max(EDITOR_SIZE / width, EDITOR_SIZE / height);
      setCrop({ source, width, height, minScale, scale: minScale, x: 0, y: 0 });
    } catch {
      URL.revokeObjectURL(source);
      onError("تصویر انتخاب‌شده قابل استفاده نیست. عکس دیگری را امتحان کنید.");
    }
  }

  function updateZoom(value: number) {
    setCrop((current) => {
      if (!current) return current;
      const nextRange = value / current.scale;
      return constrainCrop(current, { scale: value, x: current.x * nextRange, y: current.y * nextRange });
    });
  }

  function beginDrag(event: PointerEvent<HTMLDivElement>) {
    if (!crop) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
  }

  function drag(event: PointerEvent<HTMLDivElement>) {
    const start = dragRef.current;
    if (!crop || !start || start.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    setCrop((current) => current ? constrainCrop(current, { scale: current.scale, x: current.x + deltaX, y: current.y + deltaY }) : current);
  }

  function endDrag() {
    dragRef.current = null;
  }

  function moveCrop(x: number, y: number) {
    setCrop((current) => current ? constrainCrop(current, { scale: current.scale, x: current.x + x, y: current.y + y }) : current);
  }

  async function applyCrop() {
    if (!crop || isRendering) return;
    try {
      setIsRendering(true);
      const avatarData = await renderAvatar(crop);
      setPreview(avatarData);
      onChange(avatarData);
      setCrop(null);
    } catch {
      onError("آماده‌سازی تصویر انجام نشد. دوباره تلاش کنید.");
    } finally {
      setIsRendering(false);
    }
  }

  function removePhoto() {
    setPreview(null);
    onChange(null);
  }

  return (
    <>
      <section aria-label="تصویر پروفایل" className="grid justify-items-center gap-8 pb-12 pt-4">
        <button aria-label="تغییر عکس پروفایل" className="group relative grid size-[112px] place-items-center rounded-full border-0 bg-transparent p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-4" onClick={() => inputRef.current?.click()} type="button">
          <Avatar alt={alt} className="size-[112px] text-heading-24 [&_svg]:size-48" size="xl" src={preview ?? undefined} />
          <span aria-hidden className="absolute bottom-0 right-0 grid size-[36px] place-items-center rounded-full border-2 border-surface-background bg-secondary text-on-secondary shadow-sm transition-transform group-hover:scale-105">
            <Camera className="size-18" />
          </span>
        </button>
        <div className="flex items-center gap-12" dir="rtl">
          <button className="inline-flex items-center gap-4 border-0 bg-transparent p-4 font-sans text-label-14 font-bold text-secondary underline-offset-4 hover:underline focus-visible:rounded-s focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary" onClick={() => inputRef.current?.click()} type="button">
            <Pencil aria-hidden className="size-16" />
            {preview ? "تغییر عکس" : "افزودن عکس پروفایل"}
          </button>
          {preview ? <button className="inline-flex items-center gap-4 border-0 bg-transparent p-4 font-sans text-label-14 text-error underline-offset-4 hover:underline focus-visible:rounded-s focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error" onClick={removePhoto} type="button"><Trash2 aria-hidden className="size-16" />حذف عکس</button> : null}
        </div>
        <input accept="image/jpeg,image/png,image/webp" aria-label="انتخاب عکس پروفایل" className="sr-only" onChange={(event) => void chooseFile(event)} ref={inputRef} type="file" />
      </section>

      <BottomSheet onOpenChange={(open) => { if (!open && !isRendering) setCrop(null); }} open={Boolean(crop)}>
        <BottomSheetContent
          aria-describedby="avatar-crop-description"
          footer={<div className="grid grid-cols-2 gap-8 border-t border-border-low-emphasis bg-surface-background px-16 pb-[max(env(safe-area-inset-bottom),var(--spacing-24))] pt-8"><Button disabled={isRendering} onClick={() => setCrop(null)} size="large" variant="tertiary-outline">انصراف</Button><Button loading={isRendering} onClick={() => void applyCrop()} size="large" variant="secondary-filled">استفاده از این عکس</Button></div>}
        >
          <BottomSheetHeader>
            <BottomSheetTitle className="m-0 font-sans text-title-18 font-bold text-surface-neutral-high-emphasis">تنظیم عکس پروفایل</BottomSheetTitle>
            <BottomSheetDescription className="m-0 text-body-14 text-surface-neutral-mid-emphasis" id="avatar-crop-description">عکس را بکشید و با نوار زیر بزرگ‌نمایی کنید.</BottomSheetDescription>
          </BottomSheetHeader>
          {crop ? (
            <div className="grid justify-items-center gap-20 px-16 pb-24 [direction:rtl]">
              <div aria-describedby="avatar-crop-description" aria-label="پیش‌نمایش برش عکس؛ با کلیدهای جهت‌نما تصویر را جابه‌جا کنید." className="relative size-[256px] touch-none overflow-hidden rounded-full bg-surface-soft shadow-inner focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-4" onKeyDown={(event) => {
                const distance = event.shiftKey ? 24 : 8;
                if (event.key === "ArrowLeft") { event.preventDefault(); moveCrop(-distance, 0); }
                if (event.key === "ArrowRight") { event.preventDefault(); moveCrop(distance, 0); }
                if (event.key === "ArrowUp") { event.preventDefault(); moveCrop(0, -distance); }
                if (event.key === "ArrowDown") { event.preventDefault(); moveCrop(0, distance); }
              }} onPointerCancel={endDrag} onPointerDown={beginDrag} onPointerMove={drag} onPointerUp={endDrag} role="group" tabIndex={0}>
                <img alt="" className="pointer-events-none absolute max-w-none select-none" draggable={false} src={crop.source} style={{ height: crop.height * crop.scale, left: `calc(50% - ${(crop.width * crop.scale) / 2}px + ${crop.x}px)`, top: `calc(50% - ${(crop.height * crop.scale) / 2}px + ${crop.y}px)`, width: crop.width * crop.scale }} />
                <span aria-hidden className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-inset ring-white/80" />
              </div>
              <label className="grid w-full max-w-[20rem] grid-cols-[auto_1fr_auto] items-center gap-12 text-label-12 text-surface-neutral-mid-emphasis">
                <ZoomIn aria-hidden className="size-20" />
                <input aria-label="بزرگ‌نمایی عکس" className="h-4 w-full cursor-pointer appearance-none rounded-full bg-border-mid-emphasis accent-secondary" max={crop.minScale * 4} min={crop.minScale} onChange={(event) => updateZoom(Number(event.currentTarget.value))} step={(crop.minScale * 4 - crop.minScale) / 100} type="range" value={crop.scale} />
                <span>بزرگ‌نمایی</span>
              </label>
              <div className="flex items-center gap-6 text-label-12 text-surface-neutral-mid-emphasis"><Upload aria-hidden className="size-16" />JPEG، PNG یا WebP تا ۱۰ مگابایت</div>
            </div>
          ) : null}
        </BottomSheetContent>
      </BottomSheet>
    </>
  );
}
