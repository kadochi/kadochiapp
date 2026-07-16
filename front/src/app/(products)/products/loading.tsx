import { ProductCardSkeleton } from "@/features/products/components/product-card-skeleton";

export default function Loading() {
  return (
    <section aria-label="در حال بارگذاری محصولات" className="grid grid-cols-2 gap-16 px-16 pb-24 pt-24 min-[640px]:grid-cols-4 min-[1024px]:grid-cols-6 min-[1024px]:gap-20">
      {Array.from({ length: 12 }, (_, index) => <ProductCardSkeleton key={index} />)}
    </section>
  );
}
