import ProductCardSkeleton from "@/domains/catalog/components/ProductCard/ProductCardSkeleton";
import s from "./products.module.css";
import Header from "@/components/layout/Header/Header";

export default function Loading() {
  return (
    <main dir="rtl">
      <Header />
      <div className="plp">
        {/* Filter bar skeleton */}
        <div className={s.filterBar}>
          <nav className={s.scrollArea} aria-label="فیلترها (در حال بارگذاری)">
            <span className={s.skeletonChip} />
            <span className={s.skeletonChip} />
            <span className={s.skeletonChip} />
            <span className={s.skeletonChip} />
            <span className={s.skeletonChip} />
            <span className={s.skeletonChip} />
          </nav>
        </div>

        {/* Breadcrumb skeleton */}
        <div className={s.breadcrumbRow}>
          <span className={s.skeletonCrumb} />
          <span className={s.skeletonCrumb} />
          <span className={s.skeletonCrumbSm} />
        </div>

        <div className={s.content}>
          {/* Section header skeleton */}
          <header className={s.sectionHeaderSkel}>
            <div className={s.skeletonTitleLg} />
            <div className={s.skeletonSub} />
          </header>

          {/* Grid skeletons */}
          <section className={s.grid} aria-hidden>
            {Array.from({ length: 12 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </section>

          {/* Footer button skeleton */}
          <footer className={s.footer}>
            <span className={s.skeletonMoreBtn} />
          </footer>
        </div>
      </div>
    </main>
  );
}
