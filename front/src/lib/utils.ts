import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * Matches the app's custom typography scale (e.g. `label-12`, `heading-32`) so
 * `text-*` typography tokens are grouped as font-size instead of text-color.
 * Without this, `cn("text-error", "text-label-12")` would drop `text-error`.
 */
const isTypographySize = (value: string) =>
  /^(label|body|title|heading)-\d+$/.test(value);

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      // Custom typography tokens belong to font-size, not text-color.
      "font-size": [{ text: [isTypographySize] }],
      // `font-regular`/`font-extrabold` are custom weights, not font-families.
      "font-weight": [
        { font: ["light", "regular", "bold", "extrabold"] },
      ],
      // Custom radius scale, including the fully-rounded `rounded-rounded`.
      rounded: [
        {
          rounded: [
            "none",
            "xxs",
            "xs",
            "s",
            "m",
            "l",
            "xl",
            "xxl",
            "rounded",
          ],
        },
      ],
    },
  },
});

/** Merge conditional class names, resolving Tailwind conflicts. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
