import type { Meta, StoryObj } from "@storybook/react";
import ProductCard from "./ProductCard";
import ProductCardSkeleton from "./ProductCardSkeleton";

const meta: Meta<typeof ProductCard> = {
  title: "Layout/ProductCard",
  component: ProductCard,
  parameters: { layout: "centered" },
  argTypes: {
    href: { control: "text" },
    title: { control: "text" },
    imageSrc: { control: "text" },
    price: { control: "number" },
    previousPrice: { control: "number" },
    offPercent: { control: "number" },
    currencyLabel: { control: "text" },
  },
  args: {
    href: "#",
    title: "باکس گل رز قرمز کلاسیک",
    imageSrc: "/images/products/rose-box.jpg",
    price: 490000,
    previousPrice: 590000,
    offPercent: 17,
    currencyLabel: "تومان",
  },
};
export default meta;

type Story = StoryObj<typeof ProductCard>;

/* ----------------------------- Default ----------------------------- */
export const Default: Story = {
  args: {
    href: "#",
    title: "عروسک خرس قرمز",
    imageSrc: "/images/red-bear.png",
    price: 320000,
    previousPrice: undefined,
    offPercent: undefined,
  },
};

/* --------------------------- With Discount --------------------------- */
export const WithDiscount: Story = {
  args: {
    href: "#",
    title: "عروسک خرس قرمز",
    imageSrc: "/images/red-bear.png",
    price: 490000,
    previousPrice: 590000,
    offPercent: 17,
  },
};

/* --------------------------- Multiple Cards --------------------------- */
export const Grid: Story = {
  render: () => (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
        gap: "24px",
        maxWidth: "960px",
      }}
    >
      <ProductCard
        title="فندک زیپو ۱"
        imageSrc="/images/zippo-1.png"
        price={215000}
        previousPrice={260000}
        offPercent={17}
      />
      <ProductCard
        title="باکس گل آفتابگردان"
        imageSrc="/images/flower.png"
        price={380000}
      />
      <ProductCard
        title="فندک زیپو ۲"
        imageSrc="/images/zippo-2.png"
        price={680000}
        previousPrice={820000}
        offPercent={17}
      />
      <ProductCard
        title="عروسک خرس قرمز روز ولنتاین"
        imageSrc="/images/red-bear.png"
        price={790000}
      />
    </div>
  ),
};

/* --------------------------- Skeleton --------------------------- */
export const Skeleton: StoryObj = {
  render: () => (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
        gap: "24px",
        maxWidth: "960px",
      }}
    >
      <ProductCardSkeleton />
      <ProductCardSkeleton />
      <ProductCardSkeleton />
      <ProductCardSkeleton />
    </div>
  ),
};
