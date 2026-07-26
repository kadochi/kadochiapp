import type { Metadata } from "next";

import LayoutContent from "@/components/layout/layout-content";
import { GiftFinder } from "@/features/gift-finder/components/gift-finder";
import { listCategories, listProductTags } from "@/features/products/services/products.server";
import type { ProductCategory, ProductTag } from "@/features/products/types";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "کادوچی | کادو چی بخرم؟",
  description: "با چند انتخاب ساده، کادوی مناسب برای شخص و مناسبت موردنظرتان را پیدا کنید.",
  alternates: { canonical: "/gift-finder" },
};

const recipientDefinitions = [
  { description: "تا ۵ سال", imageUrl: "/images/gift-finder/boy-kid.png", label: "پسر بچه", tagName: "baby boy" },
  { description: "۶ تا ۱۸ سال", imageUrl: "/images/gift-finder/boy.png", label: "پسر نوجوان", tagName: "teenage boy" },
  { description: "۱۹ تا ۳۵ سال", imageUrl: "/images/gift-finder/man.png", label: "مرد جوان", tagName: "young man" },
  { description: "۳۶ سال به بالا", imageUrl: "/images/gift-finder/adult-man.png", label: "مرد بزرگسال", tagName: "adult man" },
  { description: "تا ۵ سال", imageUrl: "/images/gift-finder/girl-kid.png", label: "دختر بچه", tagName: "baby girl" },
  { description: "۶ تا ۱۸ سال", imageUrl: "/images/gift-finder/girl.png", label: "دختر نوجوان", tagName: "teenage girl" },
  { description: "۱۹ تا ۳۵ سال", imageUrl: "/images/gift-finder/woman.png", label: "زن جوان", tagName: "young woman" },
  { description: "۳۶ سال به بالا", imageUrl: "/images/gift-finder/adult-woman.png", label: "زن بزرگسال", tagName: "adult woman" },
] as const;

const occasionDefinitions = [
  { id: "parents", imageUrl: "/images/gift-finder/occasion-mother-father.png", label: "روز مادر یا روز پدر", tagSlugs: ["motherday", "fatherday"] },
  { id: "anniversary", imageUrl: "/images/gift-finder/occasion-anniv.png", label: "سالگرد ازدواج", tagSlugs: ["anniversary"] },
  { id: "birthday", imageUrl: "/images/gift-finder/occasion-birthday.png", label: "جشن تولد", tagSlugs: ["birthday"] },
  { id: "none", imageUrl: "/images/gift-finder/no-occasion.png", label: "بدون مناسبت", tagSlugs: [] },
  { id: "graduation", imageUrl: "/images/gift-finder/occasion-grad.png", label: "شروع مسیر جدید", tagSlugs: ["graduation"] },
  { id: "newyear", imageUrl: "/images/gift-finder/occasion-newyear.png", label: "عید نوروز", tagSlugs: ["newyear"] },
  { id: "yalda", imageUrl: "/images/gift-finder/occasion-yalda.png", label: "شب یلدا", tagSlugs: ["yalda"] },
  { id: "valentine", imageUrl: "/images/gift-finder/occasion-valentine.png", label: "روز عشق و ولنتاین", tagSlugs: ["valentine"] },
] as const;

const categoryArtwork: Array<{ imageUrl: string; terms: readonly string[] }> = [
  { imageUrl: "/images/gift-finder/cat-flower.png", terms: ["flower", "گل"] },
  { imageUrl: "/images/gift-finder/cat-chocolate.png", terms: ["chocolate", "شکلات"] },
  { imageUrl: "/images/gift-finder/cat-gold.png", terms: ["gold", "jewelry", "jewellery", "طلا", "زیور"] },
  { imageUrl: "/images/gift-finder/cat-tech.png", terms: ["tech", "digital", "electronic", "technology", "دیجیتال", "تکنولوژی"] },
  { imageUrl: "/images/gift-finder/cat-fashion.png", terms: ["fashion", "clothing", "apparel", "مد", "پوشاک"] },
  { imageUrl: "/images/gift-finder/cat-game.png", terms: ["game", "toy", "بازی", "اسباب"] },
  { imageUrl: "/images/gift-finder/cat-home.png", terms: ["home", "kitchen", "house", "خانه", "آشپز"] },
  { imageUrl: "/images/gift-finder/cat-beauty.png", terms: ["beauty", "cosmetic", "آرایشی", "زیبایی"] },
];

function normalized(value: string) {
  return value.trim().toLocaleLowerCase("en-US");
}

function matchesTerm(category: ProductCategory, term: string) {
  const target = normalized(term);
  return normalized(category.slug).includes(target) || normalized(category.name).includes(target);
}

function categoryImage(category: ProductCategory) {
  return categoryArtwork.find((item) => item.terms.some((term) => matchesTerm(category, term)))?.imageUrl ?? category.imageUrl;
}

function giftFinderOptions(tags: readonly ProductTag[], categories: readonly ProductCategory[]) {
  const recipientOptions = recipientDefinitions.flatMap(({ tagName, ...definition }) => {
    const tag = tags.find((item) => normalized(item.name) === tagName);
    // Store API's tag endpoint omits empty tags. The finder still needs to
    // present all of the WooCommerce recipient tags specified for this flow.
    const slug = tag?.slug ?? tagName.replaceAll(" ", "-");
    return [{ id: slug, ...definition, tagSlugs: [slug] }];
  });

  const occasionOptions = occasionDefinitions.map(({ id, imageUrl, label, tagSlugs }) => ({
    id,
    imageUrl,
    label,
    tagSlugs: [...tagSlugs],
  }));

  const categoryOptions = categories.map((category) => ({
    id: category.slug,
    imageUrl: categoryImage(category),
    label: category.name,
    description: category.description || "دسته‌بندی هدیه",
    slug: category.slug,
  }));

  return { categoryOptions, occasionOptions, recipientOptions };
}

export default async function GiftFinderPage() {
  const [tags, categories] = await Promise.all([
    listProductTags(),
    listCategories({ hideEmpty: true, perPage: 100 }),
  ]);

  return (
    <LayoutContent showFooter={false}>
      <GiftFinder {...giftFinderOptions(tags, categories)} />
    </LayoutContent>
  );
}
