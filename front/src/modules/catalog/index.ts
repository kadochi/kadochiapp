// Schema
export { wooStoreProductSchema, wooV3ProductSchema, wooStoreCategorySchema, wooStoreCategoriesSchema, wooStoreProductsSchema } from "./schema";
export type { WooStoreProduct, WooV3Product, WooStoreCategory, WooStoreImage, WooStorePrice } from "./schema";

// Types
export type { Currency, Price, StockStatus, MediaImage, Category, Attribute, Product, ProductDetail, ProductComment, StoreCategory } from "./types";

// Services
export { mapStoreProductToCard, mapStoreProducts, mapStoreProductToDetail, fetchStoreProducts, fetchStoreProductById, listProducts, getProductDetail, fetchProductComments, createProductReview, fetchWpTagMeta, getPublishedProductsForSitemap } from "./services/products";
export { fetchStoreCategories, fetchWpCategoryMeta, getAllCategoriesForFilter } from "./services/categories";

// Hooks
export { useProducts, useProductDetail } from "./hooks/useProducts";

// Utils
export { parseAmount, toPrice, irrToIrt, pickCurrency } from "./utils/price";
export { inferInStock, mapWooStockStatus } from "./utils/stock";
export { stripHtml } from "./utils/html";

// Components
export { default as ProductCard } from "./components/ProductCard/ProductCard";
export { default as ProductCardSkeleton } from "./components/ProductCard/ProductCardSkeleton";
export { default as ProductCarousel } from "./components/ProductCarousel/ProductCarousel";
export { default as ProductCarouselClient } from "./components/ProductCarousel/ProductCarousel.client";
export { default as ProductListClient } from "./components/ProductList/ProductList.client";
export { default as CategoryCarousel } from "./components/CategoryCarousel/CategoryCarousel";
export { default as CategoryCarouselClient } from "./components/CategoryCarousel/CategoryCarouselClient";
export { default as ImageGallery } from "./components/ImageGallery/ImageGallery";
export { default as ProductGallery } from "./components/ProductGallery/ProductGallery";
