export type DeliveryPartKey = "صبح" | "ظهر" | "عصر";

export type DeliveryPartDescriptor = {
  key: DeliveryPartKey;
  fromHour: number;
  toHour: number;
  fromLabel: string;
  toLabel: string;
};

export type PackagingId = "normal" | "gift";

export type Slot = {
  id: string;
  dayLabel: string;
  dateLabel: string;
  part: DeliveryPartKey;
  from: string;
  to: string;
  disabled?: boolean;
};

export type StoreProduct = {
  id: number;
  name?: string;
  prices?: {
    price?: string | null;
    sale_price?: string | null;
    regular_price?: string | null;
  };
  tags?: Array<{ id?: number; slug?: string; name?: string }>;
};

export type ViewProduct = {
  id: number;
  prices?: StoreProduct["prices"];
};

export type CheckoutSender = {
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
};

export type CheckoutReceiver = {
  isSelf: boolean;
  name: string;
  phone?: string;
  address: string;
};

export type CheckoutFigures = {
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  shipping?: number;
  packaging?: number;
};

export type CheckoutDelivery =
  | string
  | { slot_id?: string; label?: string }
  | null;

export type CheckoutPackaging = {
  id?: "normal" | "gift";
  title?: string;
  price?: number;
  postcard_message?: string;
} | null;

export type CheckoutStartPayload = {
  items: { product_id: number; quantity: number }[];
  sender: CheckoutSender;
  receiver: CheckoutReceiver;
  figures: CheckoutFigures;
  delivery?: CheckoutDelivery;
  packaging?: CheckoutPackaging;
  payMethod: "online";
};

export type CheckoutStartResponse = {
  ok: boolean;
  error?: string;
  redirectUrl?: string;
  orderId?: number;
  amount?: number;
};

export type PayVerifyBody = {
  Authority?: string;
  amount?: number;
  currency?: "IRT" | "IRR";
  orderId?: string | number;
};

export type PayStartBody = {
  amount: number;
  description?: string;
  email?: string;
  mobile?: string;
  orderId?: string | number;
  currency?: "IRT" | "IRR";
};

export type RawWooStatus =
  | "pending"
  | "pending-payment"
  | "processing"
  | "on-hold"
  | "completed"
  | "cancelled"
  | "canceled"
  | "refunded"
  | "failed"
  | "draft"
  | string;

export type OrderStatus =
  | "pending"
  | "processing"
  | "on-hold"
  | "completed"
  | "canceled"
  | "refunded"
  | "failed"
  | "draft";

export type OrderLineItem = {
  id: number | string;
  product_id?: number | string | null;
  name?: string;
  quantity?: number;
  image?: { src: string; alt?: string } | null;
};

export type OrderSummary = {
  id: number | string;
  status: OrderStatus;
  created_at: string;
  total: number;
  line_items: OrderLineItem[];
};

export type OrderDetail = {
  id: number | string;
  status: OrderStatus;
  created_at: string;
  sender?: string;
  receiver?: string;
  delivery_window?: string;
  address?: string;
  postcard_message?: string;
  items: Array<{ id: number | string; name?: string; image?: string | null }>;
  summary: {
    subtotal?: number;
    tax?: number;
    shipping?: number;
    service?: number;
    total?: number;
  };
};
