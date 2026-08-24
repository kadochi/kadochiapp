import "server-only";

import { randomUUID } from "crypto";
import type { Metadata } from "next";

import { wordpressFetch, parseUpstreamJson } from "@/lib/http/upstream";
import { upstreamProductsSchema } from "@/features/products/schema/products";
import type { Product } from "@/features/products/types";
import { mapProduct } from "@/features/products/utils/map-product";
import { productPath } from "@/features/products/utils/product-seo";

/**
 * This is an integration-only feed for Torob. It deliberately has no client
 * components, pagination controls, or API route: the complete current catalog
 * is rendered into the response HTML for a third-party crawler to read.
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "فهرست محصولات کادوچی",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

type ProductPage = {
  items: Product[];
  totalPages: number;
};

async function availableProductPage(page: number): Promise<ProductPage> {
  const params = new URLSearchParams({ page: String(page), per_page: "50" });
  // Backorders are purchasable in WooCommerce and are treated as available by
  // the storefront catalog as well.
  params.append("stock_status[]", "instock");
  params.append("stock_status[]", "onbackorder");

  const requestId = randomUUID();
  const response = await wordpressFetch(`/wp-json/wc/store/v1/products?${params}`, {
    cache: "no-store",
    requestId,
  });
  const totalPages = Number(response.headers.get("x-wp-totalpages"));
  const items = (await parseUpstreamJson(response, (value) => upstreamProductsSchema.parse(value), requestId))
    .map(mapProduct)
    .filter((product) => product.inStock && product.purchasable);

  return {
    items,
    totalPages: Number.isSafeInteger(totalPages) && totalPages > 0 ? totalPages : 1,
  };
}

async function listAllAvailableProducts(): Promise<Product[]> {
  const firstPage = await availableProductPage(1);
  if (firstPage.totalPages === 1) return firstPage.items;

  const remainingPages = await Promise.all(
    Array.from({ length: firstPage.totalPages - 1 }, (_unused, index) => availableProductPage(index + 2)),
  );
  return [
    ...firstPage.items,
    ...remainingPages.flatMap((page) => page.items),
  ];
}

function productPrice(product: Product): string {
  const divisor = BigInt(10) ** BigInt(product.price.minorUnit + (product.price.currencyCode === "IRR" ? 1 : 0));
  return (BigInt(product.price.amount) / divisor).toString();
}

function guarantee(product: Product): string {
  const attribute = product.attributes.find(({ name }) => {
    const normalizedName = name.trim().toLocaleLowerCase("fa-IR");
    return normalizedName.includes("گارانتی")
      || normalizedName.includes("ضمانت")
      || normalizedName.includes("guarantee")
      || normalizedName.includes("warranty");
  });

  // A missing guarantee attribute means this product has no stated guarantee.
  return attribute?.value || "بدون گارانتی";
}

export default async function TorobPage() {
  const products = await listAllAvailableProducts();

  return (
    <main dir="rtl" lang="fa" style={{ margin: "0 auto", maxWidth: 960, padding: 24 }}>
      <h1>فهرست محصولات کادوچی</h1>
      <p>آخرین به‌روزرسانی فهرست محصولات موجود</p>

      <section aria-label="محصولات موجود">
        {products.map((product) => {
          const image = product.images[0];
          const availability = product.inStock && product.purchasable ? "instock" : "outofstock";

          return (
            <article key={product.id} style={{ borderBottom: "1px solid #ddd", padding: "20px 0" }}>
              <meta name="product_id" content={String(product.id)} />
              <meta name="product_name" content={product.name} />
              <meta property="og:image" content={image?.url ?? ""} />
              <meta name="product_price" content={productPrice(product)} />
              <meta name="availability" content={availability} />
              <meta name="guarantee" content={guarantee(product)} />

              <h2 style={{ margin: "0 0 8px" }}>
                <a href={productPath(product.slug)}>{product.name}</a>
              </h2>
              {image ? (
                // Plain img keeps the product image available when JavaScript is disabled.
                // eslint-disable-next-line @next/next/no-img-element
                <img alt={image.alt || product.name} src={image.url} style={{ height: "auto", maxWidth: 180 }} />
              ) : null}
              <p>قیمت: {productPrice(product)} تومان</p>
              <p>وضعیت: موجود</p>
              <p>گارانتی: {guarantee(product)}</p>
            </article>
          );
        })}
      </section>
    </main>
  );
}
