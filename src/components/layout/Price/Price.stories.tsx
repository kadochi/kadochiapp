import type { Meta, StoryObj } from "@storybook/react";
import NormalPrice, { type NormalSize } from "./Normal/NormalPrice";
import DiscountPrice, {
  type DiscountSize,
  type Orientation as DiscountOrientation,
} from "./Discount/DiscountPrice";
import SumPrice, { type Orientation as SumOrientation } from "./Sum/SumPrice";

const meta: Meta = {
  title: "Layout/Price",
  parameters: { layout: "centered" },
  argTypes: {
    kind: { control: "select", options: ["normal", "discount", "sum"] },
    size: { control: "select", options: ["L", "M"] },
    orientation: { control: "select", options: ["horizontal", "vertical"] },
    amount: { control: "number" },
    previous: { control: "number" },
    offPercent: { control: "number" },
    currencyLabel: { control: "text" },
    label: { control: "text" },
    showArrowOnLargeH: {
      control: "boolean",
      description: "Only for Discount (L + horizontal)",
    },
    separate: {
      control: "boolean",
      description: "Only for Sum horizontal (label right, price left)",
    },
  },
};
export default meta;

type Args = {
  kind: "normal" | "discount" | "sum";
  size: NormalSize | DiscountSize;
  orientation: DiscountOrientation | SumOrientation;
  amount: number;
  previous?: number;
  offPercent?: number;
  currencyLabel?: string;
  label?: string;
  showArrowOnLargeH?: boolean;
  separate?: boolean;
};

export const Playground: StoryObj<Args> = {
  args: {
    kind: "discount",
    size: "L",
    orientation: "horizontal",
    amount: 4_200_000,
    previous: 5_600_000,
    offPercent: 25,
    currencyLabel: "تومان",
    label: "جمع کل",
    showArrowOnLargeH: true,
    separate: false,
  },
  render: (args) => {
    const common = { currencyLabel: args.currencyLabel };

    if (args.kind === "normal") {
      return (
        <NormalPrice
          amount={args.amount}
          size={args.size as NormalSize}
          {...common}
        />
      );
    }

    if (args.kind === "sum") {
      return (
        <SumPrice
          amount={args.amount}
          orientation={args.orientation as SumOrientation}
          label={args.label}
          separate={args.separate}
          {...common}
        />
      );
    }

    return (
      <DiscountPrice
        current={args.amount}
        previous={args.previous ?? 0}
        offPercent={args.offPercent ?? 0}
        size={args.size as DiscountSize}
        orientation={args.orientation as DiscountOrientation}
        showArrowOnLargeH={args.showArrowOnLargeH}
        {...common}
      />
    );
  },
};
