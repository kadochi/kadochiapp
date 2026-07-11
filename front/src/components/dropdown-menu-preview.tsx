"use client";

import { Copy, Ellipsis, Pencil, Share2, Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

function DropdownMenuPreview() {
  return (
    <section className="mt-16" aria-labelledby="dropdown-menu-heading">
      <div className="mb-6 flex items-baseline justify-between gap-4">
        <h2 id="dropdown-menu-heading" className="text-heading-24 font-regular">
          منوی کشویی
        </h2>
        <p className="text-label-12 text-surface-neutral-low-emphasis">
          فعال‌سازی با دکمه · آیکون · آیتم خطر · جداکننده
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-16 rounded-m border border-border-low-emphasis bg-surface-background px-5 py-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="tertiary-outline" size="small">
              <Ellipsis aria-hidden="true" />
              گزینه‌ها
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>عملیات</DropdownMenuLabel>
            <DropdownMenuItem>
              <Pencil aria-hidden="true" />
              ویرایش
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Copy aria-hidden="true" />
              کپی
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Share2 aria-hidden="true" />
              اشتراک‌گذاری
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem tone="danger">
              <Trash2 aria-hidden="true" />
              حذف
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary-tonal" size="small">
              منوی حساب
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem>پروفایل</DropdownMenuItem>
            <DropdownMenuItem>تنظیمات</DropdownMenuItem>
            <DropdownMenuItem disabled>صورتحساب (به‌زودی)</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem tone="danger">خروج</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </section>
  );
}

export { DropdownMenuPreview };
