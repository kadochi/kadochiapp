import { listCategories, listProductTags } from "@/features/products/services/products.server";
import type { ProductCategory, ProductTag } from "@/features/products/types";

import { GiftFinder, type GiftFinderDismissMode } from "./gift-finder";
import type {
  GiftFinderRecipientAgeBand,
  GiftFinderRecipientGender,
  GiftFinderTagOption,
} from "../gift-finder-flow";

const recipientDefinitions = [
  { ageBand: "child", description: "تا ۵ سال", gender: "male", imageUrl: "/images/gift-finder/boy-kid.png", label: "پسر بچه", tagName: "baby boy" },
  { ageBand: "teen", description: "۶ تا ۱۸ سال", gender: "male", imageUrl: "/images/gift-finder/boy.png", label: "پسر نوجوان", tagName: "teenage boy" },
  { ageBand: "young-adult", description: "۱۹ تا ۳۵ سال", gender: "male", imageUrl: "/images/gift-finder/man.png", label: "مرد جوان", tagName: "young man" },
  { ageBand: "adult", description: "۳۶ سال به بالا", gender: "male", imageUrl: "/images/gift-finder/adult-man.png", label: "مرد بزرگسال", tagName: "adult man" },
  { ageBand: "child", description: "تا ۵ سال", gender: "female", imageUrl: "/images/gift-finder/girl-kid.png", label: "دختر بچه", tagName: "baby girl" },
  { ageBand: "teen", description: "۶ تا ۱۸ سال", gender: "female", imageUrl: "/images/gift-finder/girl.png", label: "دختر نوجوان", tagName: "teenage girl" },
  { ageBand: "young-adult", description: "۱۹ تا ۳۵ سال", gender: "female", imageUrl: "/images/gift-finder/woman.png", label: "زن جوان", tagName: "young woman" },
  { ageBand: "adult", description: "۳۶ سال به بالا", gender: "female", imageUrl: "/images/gift-finder/adult-woman.png", label: "زن بزرگسال", tagName: "adult woman" },
] as const satisfies readonly {
  ageBand: GiftFinderRecipientAgeBand;
  description: string;
  gender: Exclude<GiftFinderRecipientGender, "any">;
  imageUrl: string;
  label: string;
  tagName: string;
}[];

const occasionDefinitions = [
  { id: "motherday", imageUrl: "/images/gift-finder/occasion-mother-father.png", label: "روز مادر", tagSlugs: ["motherday"] },
  { id: "fatherday", imageUrl: "/images/gift-finder/occasion-mother-father.png", label: "روز پدر", tagSlugs: ["fatherday"] },
  { id: "anniversary", imageUrl: "/images/gift-finder/occasion-anniv.png", label: "سالگرد ازدواج", tagSlugs: ["anniversary"] },
  { id: "birthday", imageUrl: "/images/gift-finder/occasion-birthday.png", label: "جشن تولد", tagSlugs: ["birthday"] },
  { id: "child-birthday", imageUrl: "/images/gift-finder/occasion-birthday.png", label: "تولد کودک", tagSlugs: ["birthday"] },
  { id: "none", imageUrl: "/images/gift-finder/no-occasion.png", label: "بدون مناسبت", tagSlugs: [] },
  { id: "graduation", imageUrl: "/images/gift-finder/occasion-grad.png", label: "شروع مسیر جدید", tagSlugs: ["graduation"] },
  { id: "newyear", imageUrl: "/images/gift-finder/occasion-newyear.png", label: "عید نوروز", tagSlugs: ["newyear"] },
  { id: "yalda", imageUrl: "/images/gift-finder/occasion-yalda.png", label: "شب یلدا", tagSlugs: ["yalda"] },
  { id: "valentine", imageUrl: "/images/gift-finder/occasion-valentine.png", label: "روز عشق و ولنتاین", tagSlugs: ["valentine"] },
] as const;

/** Optional occasions surface only when their existing product tags are present. */
const optionalOccasionDefinitions = [
  { id: "proposal-engagement", label: "خواستگاری و نامزدی", terms: ["proposal", "engagement", "خواستگاری", "نامزدی"] },
  { id: "professional-gift", label: "هدیه رسمی و کاری", terms: ["professional", "formal", "کاری", "رسمی"] },
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

function matchingTagSlugs(tags: readonly ProductTag[], terms: readonly string[]) {
  return tags
    .filter((tag) => terms.some((term) => {
      const target = normalized(term);
      return normalized(tag.slug).includes(target) || normalized(tag.name).includes(target);
    }))
    .map((tag) => tag.slug);
}

function giftFinderOptions(tags: readonly ProductTag[], categories: readonly ProductCategory[]) {
  const recipientOptions = recipientDefinitions.flatMap(({ tagName, ...definition }) => {
    const tag = tags.find((item) => normalized(item.name) === tagName);
    // Store API's tag endpoint omits empty tags. The finder still needs to
    // present all of the WooCommerce recipient tags specified for this flow.
    const slug = tag?.slug ?? tagName.replaceAll(" ", "-");
    return [{ id: slug, ...definition, tagSlugs: [slug] }];
  });

  const occasionOptions: GiftFinderTagOption[] = [
    ...occasionDefinitions.map(({ id, imageUrl, label, tagSlugs }) => ({
      id,
      imageUrl,
      label,
      tagSlugs: [...tagSlugs],
    })),
    ...optionalOccasionDefinitions.flatMap(({ id, label, terms }) => {
      const tagSlugs = matchingTagSlugs(tags, terms);
      return tagSlugs.length ? [{ id, label, tagSlugs }] : [];
    }),
  ];

  const categoryOptions = categories.map((category) => ({
    id: category.slug,
    imageUrl: categoryImage(category),
    label: category.name,
    description: category.description || "دسته‌بندی هدیه",
    slug: category.slug,
  }));

  return { categoryOptions, occasionOptions, recipientOptions };
}

/** Shared server loader for both the direct page and intercepted modal route. */
export async function GiftFinderRoute({ dismissMode }: { dismissMode: GiftFinderDismissMode }) {
  const [tags, categories] = await Promise.all([
    listProductTags().catch(() => []),
    listCategories({ hideEmpty: true, perPage: 100 }).catch(() => []),
  ]);

  return <GiftFinder {...giftFinderOptions(tags, categories)} dismissMode={dismissMode} />;
}
