import type { Meta, StoryObj } from "@storybook/react";
import ProductCarouselClient from "./ProductCarousel.client";
const meta: Meta<typeof ProductCarouselClient> = {
  title: "Layout/ProductCarousel",
  component: ProductCarouselClient,
  parameters: { layout: "fullscreen" },
  argTypes: {
    items: { control: "object" },
    endpoint: { control: "text" },
    wpParams: { control: "object" },
    productIds: { control: "object" },
  },
};
export default meta;

type Story = StoryObj<typeof ProductCarouselClient>;

const demoItems = [
  {
    id: 1,
    image: "/images/red-bear.png",
    title: "عروسک خرس قرمز",
    price: 320000,
  },
  {
    id: 2,
    image: "/images/flower.png",
    title: "باکس گل آفتابگردان",
    price: 380000,
    previousPrice: 450000,
    offPercent: 16,
  },
  {
    id: 3,
    image: "/images/zippo-1.png",
    title: "فندک زیپو ۱",
    price: 215000,
    previousPrice: 260000,
    offPercent: 17,
  },
  {
    id: 4,
    image: "/images/zippo-2.png",
    title: "فندک زیپو ۲",
    price: 680000,
    previousPrice: 820000,
    offPercent: 17,
  },
];

export const Skeleton: Story = {
  args: { items: [] },
};

export const WithItems: Story = {
  args: { items: demoItems },
};

export const FromWP: Story = {
  args: { wpParams: { per_page: 8, orderby: "date" } },
};

export const WithIds: Story = {
  args: { productIds: [1123, 1188, 1210, 1302] },
};
