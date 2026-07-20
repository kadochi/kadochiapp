"use client";

import { useState, type ReactNode } from "react";
import {
  AtSign,
  Check,
  CircleAlert,
  Copy,
  Ellipsis,
  ExternalLink,
  Eye,
  Info,
  Link as LinkIcon,
  LockKeyhole,
  MapPin,
  Menu,
  MessageSquare,
  Pencil,
  Search,
  Share2,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { Accordion } from "../../components/ui/accordion";
import { Alert, type AlertTone } from "../../components/ui/alert";
import { Avatar } from "../../components/ui/avatar";
import { ProductCard } from "../../features/products/components/product-card";
import { ProductCardSkeleton } from "../../features/products/components/product-card-skeleton";
import { ProductList } from "../../features/products/components/product-list";
import { ProductsSlider } from "../../features/products/components/products-slider";
import type { Product } from "../../features/products/types";
import {
  BottomSheet,
  BottomSheetClose,
  BottomSheetContent,
  BottomSheetDescription,
  BottomSheetHeader,
  BottomSheetTitle,
  BottomSheetTrigger,
} from "../../components/ui/bottom-sheet";
import { Breadcrumb } from "../../components/ui/breadcrumb";
import Price, {
  DiscountPrice,
  NormalPrice,
  SumPrice,
} from "../../components/layout/price";
import { SideMenu } from "../../components/layout/side-menu";
import { TopBanner } from "../../components/layout/top-banner";
import { Button } from "../../components/ui/button";
import { Checkbox } from "../../components/ui/checkbox";
import { Chip } from "../../components/ui/chip";
import { Divider } from "../../components/ui/divider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { Input } from "../../components/ui/input";
import {
  InputStepper,
  type InputStepperProps,
} from "../../components/ui/input-stepper";
import { Label } from "../../components/ui/label";
import { ProgressStepper } from "../../components/ui/progress-stepper";
import { RadioGroup, RadioGroupItem } from "../../components/ui/radio";
import { SegmentSelector } from "../../components/ui/segment-selector";
import { Select } from "../../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { TextArea } from "../../components/ui/textarea";
import { Toggle } from "../../components/ui/toggle";
import { useToast } from "../../components/ui/toaster";

const buttonVariants = [
  { name: "اصلی", value: "primary-filled" as const },
  { name: "اصلی تونال", value: "primary-tonal" as const },
  { name: "ثانویه", value: "secondary-filled" as const },
  { name: "ثانویه تونال", value: "secondary-tonal" as const },
  { name: "خط‌دار", value: "tertiary-outline" as const },
  { name: "شبح", value: "link-ghost" as const },
];

const buttonSizes = ["small", "medium", "large"] as const;
const buttonSizeLabels: Record<(typeof buttonSizes)[number], string> = {
  small: "کوچک",
  medium: "متوسط",
  large: "بزرگ",
};

const avatarSizes = ["sm", "md", "lg", "xl"] as const;

const avatarExamples = [
  {
    name: "تصویر",
    render: (size: (typeof avatarSizes)[number]) => (
      <Avatar
        size={size}
        alt="Sahar Ahmadi"
        src="https://i.pravatar.cc/160?img=47"
      />
    ),
  },
  {
    name: "حروف اول",
    render: (size: (typeof avatarSizes)[number]) => (
      <Avatar size={size} alt="Sahar Ahmadi" />
    ),
  },
  {
    name: "جایگزین دلخواه",
    render: (size: (typeof avatarSizes)[number]) => (
      <Avatar size={size} alt="Kadochi" fallback="ک" />
    ),
  },
  {
    name: "جایگزین پیش‌فرض",
    render: (size: (typeof avatarSizes)[number]) => <Avatar size={size} />,
  },
];

function mockProduct(overrides: Partial<Product>): Product {
  return {
    id: 1,
    name: "فندک زیپو کلاسیک نقره‌ای",
    slug: "zippo-classic",
    description: "",
    shortDescription: "",
    price: { amount: "12500000", currencyCode: "IRR", minorUnit: 0 },
    images: [{ url: "/images/zippo-1.png", alt: "فندک زیپو" }],
    categories: [],
    tags: [],
    attributes: [],
    averageRating: 0,
    reviewCount: 0,
    inStock: true,
    purchasable: true,
    ...overrides,
  };
}

const productCardExamples: Product[] = [
  mockProduct({ id: 1 }),
  mockProduct({
    id: 2,
    name: "فندک زیپو طرح‌دار",
    price: { amount: "8900000", currencyCode: "IRR", minorUnit: 0 },
    regularPrice: { amount: "12000000", currencyCode: "IRR", minorUnit: 0 },
  }),
  mockProduct({ id: 3, name: "فندک زیپو ناموجود", inStock: false }),
];

const catalogPreviewProducts: Product[] = [
  mockProduct({ id: 1 }),
  mockProduct({
    id: 2,
    name: "فندک زیپو طرح‌دار",
    images: [{ url: "/images/zippo-2.png", alt: "فندک زیپو طرح‌دار" }],
    price: { amount: "8900000", currencyCode: "IRR", minorUnit: 0 },
    regularPrice: { amount: "12000000", currencyCode: "IRR", minorUnit: 0 },
  }),
  mockProduct({
    id: 3,
    name: "فندک زیپو طلایی",
    price: { amount: "14500000", currencyCode: "IRR", minorUnit: 0 },
  }),
  mockProduct({
    id: 4,
    name: "فندک زیپو مات مشکی",
    images: [{ url: "/images/zippo-2.png", alt: "فندک زیپو مات مشکی" }],
    price: { amount: "11000000", currencyCode: "IRR", minorUnit: 0 },
    regularPrice: { amount: "13500000", currencyCode: "IRR", minorUnit: 0 },
  }),
  mockProduct({ id: 5, name: "فندک زیپو ناموجود", inStock: false }),
  mockProduct({
    id: 6,
    name: "فندک زیپو کلاسیک برنزی",
    images: [{ url: "/images/zippo-2.png", alt: "فندک زیپو کلاسیک برنزی" }],
    price: { amount: "9800000", currencyCode: "IRR", minorUnit: 0 },
  }),
];

const chipVariants = [
  { name: "خط‌دار", value: "outline" as const },
  { name: "انتخاب‌شده", value: "selected" as const },
];
const chipSizes = ["sm", "md"] as const;

const labelVariants = [
  { name: "موفقیت", value: "success" as const },
  { name: "ثانویه", value: "secondary" as const },
  { name: "هشدار", value: "warning" as const },
  { name: "خطر", value: "danger" as const },
  { name: "خنثی", value: "neutral" as const },
];
const labelAppearances = ["solid", "soft", "gradient"] as const;
const labelSizes = ["sm", "md"] as const;

const dividerSpacerSizes = ["sm", "md", "lg"] as const;

const accordionVariants = [
  { name: "خط‌دار", value: "outline" as const },
  { name: "ملایم", value: "subtle" as const },
];
const accordionSizes = ["sm", "md", "lg"] as const;
const accordionItems = [
  {
    value: "shipping",
    title: "هزینه و زمان ارسال چگونه است؟",
    content: "سفارش‌ها در تهران همان روز و در سایر شهرها طی ۲ تا ۴ روز کاری ارسال می‌شوند.",
  },
  {
    value: "returns",
    title: "شرایط بازگشت کالا چیست؟",
    content: "تا ۷ روز پس از تحویل، کالاهای واجد شرایط را می‌توانید بازگردانید.",
    disabled: true,
  },
  {
    value: "payment",
    title: "چه روش‌های پرداختی در دسترس است؟",
    content: "پرداخت آنلاین با کارت‌های شتاب و پرداخت در محل، بسته به شهر مقصد، پشتیبانی می‌شود.",
  },
] as const;

const bottomSheetSizes = ["sm", "md", "lg"] as const;

const toggleTones = [
  { name: "اصلی", value: "primary" as const },
  { name: "ثانویه", value: "secondary" as const },
];
const toggleSizes = ["sm", "md"] as const;

const stepperVariants = [
  { name: "خط‌دار", value: "outline" as const },
  { name: "ملایم", value: "subtle" as const },
];
const stepperSizes = ["sm", "md"] as const;

const progressStepperSizes = ["sm", "md", "lg"] as const;
const progressStepperBaseSteps = [
  { label: "سبد خرید" },
  { label: "اطلاعات ارسال" },
  { label: "پرداخت" },
  { label: "تأیید سفارش" },
] as const;
const progressStepperStates = [
  {
    name: "در حال انجام",
    value: 1,
    steps: progressStepperBaseSteps,
  },
  {
    name: "تکمیل‌شده",
    value: 4,
    steps: progressStepperBaseSteps,
  },
  {
    name: "مراحل غیرفعال",
    value: 1,
    steps: [
      { label: "سبد خرید" },
      { label: "اطلاعات ارسال" },
      { label: "پرداخت", disabled: true },
      { label: "تأیید سفارش", disabled: true },
    ],
  },
  {
    name: "پیش‌فرض",
    steps: progressStepperBaseSteps,
  },
];

const textareaSizes = ["sm", "md", "lg"] as const;
const textareaStates = [
  {
    name: "پیش‌فرض",
    props: {
      description: "متن توضیحی اختیاری.",
      label: "توضیحات",
      required: true,
    },
  },
  {
    name: "خطا",
    props: {
      defaultValue: "خیلی کوتاه",
      description: "حداقل ۲۰ نویسه وارد کنید.",
      label: "توضیحات",
      status: "error" as const,
    },
  },
  {
    name: "موفقیت",
    props: {
      defaultValue: "یک توضیح کامل.",
      description: "خوب به نظر می‌رسد.",
      label: "توضیحات",
      status: "success" as const,
    },
  },
  {
    name: "غیرفعال",
    props: {
      defaultValue: "امکان ویرایش وجود ندارد.",
      description: "این فیلد قابل تغییر نیست.",
      disabled: true,
      label: "توضیحات",
    },
  },
];

const inputSizes = ["sm", "md", "lg"] as const;
const inputStates = [
  {
    name: "پیش‌فرض",
    props: {
      description: "متن راهنمای مفید.",
      label: "نام و نام‌خانوادگی",
      required: true,
    },
  },
  {
    name: "خطا",
    props: {
      defaultValue: "invalid-email",
      description: "یک آدرس ایمیل معتبر وارد کنید.",
      label: "آدرس ایمیل",
      status: "error" as const,
      type: "email",
    },
  },
  {
    name: "موفقیت",
    props: {
      defaultValue: "sahar@example.com",
      description: "این آدرس ایمیل در دسترس است.",
      label: "آدرس ایمیل",
      status: "success" as const,
      type: "email",
    },
  },
  {
    name: "غیرفعال",
    props: {
      defaultValue: "امکان ویرایش وجود ندارد.",
      description: "این فیلد قابل تغییر نیست.",
      disabled: true,
      label: "نام حساب",
    },
  },
];

const segmentTones = [
  { name: "اصلی", value: "primary" as const },
  { name: "ثانویه", value: "secondary" as const },
];
const segmentSizes = ["sm", "md", "lg"] as const;
const segmentItems = [
  { value: "overview", label: "نمای کلی" },
  { value: "activity", label: "فعالیت" },
  { value: "settings", label: "تنظیمات" },
];

const tabsSizes = ["sm", "md", "lg"] as const;
const tabsTones = [
  { name: "اصلی", value: "primary" as const },
  { name: "ثانویه", value: "secondary" as const },
];
const tabsPanels = [
  { value: "overview", label: "نمای کلی", body: "خلاصه‌ای از وضعیت حساب شما." },
  { value: "activity", label: "فعالیت", body: "آخرین رویدادها و تراکنش‌ها." },
  { value: "settings", label: "تنظیمات", body: "مدیریت ترجیحات و امنیت." },
];

const selectSizes = ["sm", "md", "lg"] as const;
const selectStates = [
  { name: "پیش‌فرض", props: {} },
  {
    name: "خطا",
    props: {
      status: "error" as const,
      description: "لطفاً یک شهر را انتخاب کنید.",
    },
  },
  {
    name: "موفقیت",
    props: {
      status: "success" as const,
      description: "شهر انتخاب شد.",
      defaultValue: "tehran",
    },
  },
  { name: "غیرفعال", props: { disabled: true, defaultValue: "tehran" } },
];
const selectCities = [
  { value: "tehran", label: "تهران" },
  { value: "mashhad", label: "مشهد" },
  { value: "isfahan", label: "اصفهان" },
  { value: "shiraz", label: "شیراز" },
  { value: "tabriz", label: "تبریز", disabled: true },
];

const alertTones: { tone: AlertTone; title: string; body: string }[] = [
  { tone: "info", title: "اطلاع‌رسانی", body: "نسخهٔ جدید در دسترس است." },
  { tone: "success", title: "انجام شد", body: "تغییرات با موفقیت ذخیره شد." },
  { tone: "warning", title: "هشدار", body: "اعتبار حساب شما رو به پایان است." },
  { tone: "error", title: "خطا", body: "پرداخت ناموفق بود، دوباره تلاش کنید." },
];

const toastExamples: { tone: AlertTone; label: string; title: string; body: string }[] = [
  { tone: "info", label: "اطلاع", title: "اطلاع‌رسانی", body: "نسخهٔ جدید در دسترس است." },
  { tone: "success", label: "موفقیت", title: "انجام شد", body: "سفارش شما ثبت شد." },
  { tone: "warning", label: "هشدار", title: "هشدار", body: "موجودی رو به پایان است." },
  { tone: "error", label: "خطا", title: "خطا", body: "اتصال برقرار نشد." },
];

const checkboxTones = [
  { name: "اصلی", value: "primary" as const },
  { name: "ثانویه", value: "secondary" as const },
];
const checkboxSizes = ["small", "medium"] as const;

const radioTones = [
  { name: "اصلی", value: "primary" as const },
  { name: "ثانویه", value: "secondary" as const },
];
const radioSizes = ["small", "medium"] as const;

const breadcrumbExamples = [
  {
    name: "پیش‌فرض",
    items: [
      { label: "خانه", href: "/" },
      { label: "محصولات", href: "/products" },
      { label: "موبایل و تبلت", href: "/products/mobile" },
      { label: "گوشی موبایل" },
    ],
  },
  {
    name: "مسیر طولانی",
    items: [
      { label: "خانه", href: "/" },
      { label: "لوازم دیجیتال", href: "/digital" },
      { label: "موبایل و تبلت", href: "/digital/mobile" },
      { label: "گوشی موبایل", href: "/digital/mobile/phones" },
      { label: "گوشی اپل", href: "/digital/mobile/phones/apple" },
      { label: "آیفون ۱۶ پرو مکس" },
    ],
  },
  {
    name: "جمع‌شده (حداکثر ۴ آیتم)",
    maxItems: 4,
    items: [
      { label: "خانه", href: "/" },
      { label: "لوازم دیجیتال", href: "/digital" },
      { label: "موبایل و تبلت", href: "/digital/mobile" },
      { label: "گوشی موبایل", href: "/digital/mobile/phones" },
      { label: "گوشی اپل", href: "/digital/mobile/phones/apple" },
      { label: "آیفون", href: "/digital/mobile/phones/apple/iphone" },
      { label: "آیفون ۱۶", href: "/digital/mobile/phones/apple/iphone/16" },
      { label: "آیفون ۱۶ پرو مکس" },
    ],
  },
];

function PreviewFrame({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-m border border-border-low-emphasis bg-surface-background p-5">
      {children}
    </div>
  );
}

function RemovableChip({ size }: { size: (typeof chipSizes)[number] }) {
  const [visible, setVisible] = useState(true);

  return visible ? (
    <Chip
      leadingIcon={<Tag />}
      removeLabel="حذف برچسب"
      size={size}
      onRemove={() => setVisible(false)}
    >
      قابل حذف
    </Chip>
  ) : (
    <button
      className="text-label-12 text-secondary underline underline-offset-4"
      type="button"
      onClick={() => setVisible(true)}
    >
      بازگرداندن
    </button>
  );
}

function ControlledAccordion() {
  const [value, setValue] = useState<string[]>(["shipping"]);

  return (
    <div className="flex flex-col gap-12">
      <Accordion items={accordionItems} value={value} onValueChange={setValue} />
      <p className="text-label-12 text-surface-neutral-mid-emphasis">
        باز شده: {value.length ? value.join("، ") : "هیچ‌کدام"}
      </p>
    </div>
  );
}

function SheetBody() {
  return (
    <div className="px-20 pb-20">
      <p className="text-body-14 text-text-secondary">
        محتوای شیت به‌صورت مستقل اسکرول می‌شود و استفاده از صفحه‌کلید و فوکوس را
        به‌درستی مدیریت می‌کند.
      </p>
    </div>
  );
}

function SheetExample({
  size,
  showHandle = true,
}: {
  size: (typeof bottomSheetSizes)[number];
  showHandle?: boolean;
}) {
  return (
    <BottomSheet>
      <BottomSheetTrigger asChild>
        <Button size="small" variant="tertiary-outline">
          باز کردن {size.toUpperCase()}
        </Button>
      </BottomSheetTrigger>
      <BottomSheetContent showHandle={showHandle} size={size}>
        <BottomSheetHeader>
          <div className="flex items-start justify-between gap-16">
            <div>
              <BottomSheetTitle className="text-title-18 font-regular">
                عنوان شیت
              </BottomSheetTitle>
              <BottomSheetDescription className="mt-4 text-body-14 text-text-secondary">
                نمونهٔ باز و قابل بستن
              </BottomSheetDescription>
            </div>
            <BottomSheetClose asChild>
              <button
                aria-label="بستن شیت"
                className="rounded-s p-4 text-text-secondary outline-none hover:bg-surface focus-visible:ring-2 focus-visible:ring-secondary/40"
                type="button"
              >
                <X aria-hidden="true" className="size-20" />
              </button>
            </BottomSheetClose>
          </div>
        </BottomSheetHeader>
        <SheetBody />
      </BottomSheetContent>
    </BottomSheet>
  );
}

function ControlledSheetExample() {
  const [open, setOpen] = useState(false);

  return (
    <BottomSheet open={open} onOpenChange={setOpen}>
      <Button size="small" variant="primary-filled" onClick={() => setOpen(true)}>
        باز کردن (کنترل‌شده)
      </Button>
      <BottomSheetContent size="md">
        <BottomSheetHeader>
          <BottomSheetTitle className="text-title-18 font-regular">
            شیت کنترل‌شده
          </BottomSheetTitle>
          <BottomSheetDescription className="text-body-14 text-text-secondary">
            وضعیت باز و بسته‌بودن از کامپوننت والد کنترل می‌شود.
          </BottomSheetDescription>
        </BottomSheetHeader>
        <div className="flex gap-8 px-20 pb-20">
          <Button size="small" onClick={() => setOpen(false)}>
            تأیید و بستن
          </Button>
          <BottomSheetClose asChild>
            <Button size="small" variant="link-ghost">
              انصراف
            </Button>
          </BottomSheetClose>
        </div>
      </BottomSheetContent>
    </BottomSheet>
  );
}

function ControlledToggle() {
  const [checked, setChecked] = useState(false);

  return (
    <Toggle
      checked={checked}
      label={checked ? "کنترل‌شده: روشن" : "کنترل‌شده: خاموش"}
      onCheckedChange={setChecked}
    />
  );
}

type StepperDemoProps = Pick<
  InputStepperProps,
  "disabled" | "max" | "min" | "size" | "step" | "variant"
> & {
  initialValue: number;
  removable?: boolean;
};

function StepperDemo({
  initialValue,
  min = 1,
  removable = false,
  ...props
}: StepperDemoProps) {
  const [value, setValue] = useState(initialValue);

  return (
    <InputStepper
      {...props}
      min={min}
      value={value}
      aria-label="تعداد"
      onRemove={removable ? () => setValue(min) : undefined}
      onValueChange={setValue}
    />
  );
}

function ControlledCountExample() {
  const [value, setValue] = useState("توضیح کوتاهی برای محصول.");

  return (
    <TextArea
      description="مقدار کنترل‌شده همراه با شمارش نویسه."
      label="توضیح محصول"
      maxLength={120}
      showCount
      value={value}
      onChange={(event) => setValue(event.target.value)}
    />
  );
}

function ControlledInputExample() {
  const [value, setValue] = useState("");

  return (
    <Input
      description={value ? `در حال جست‌وجوی «${value}».` : "برای جست‌وجو تایپ کنید."}
      label="جست‌وجوی محصولات"
      leadingIcon={<Search />}
      placeholder="جست‌وجو..."
      value={value}
      onChange={(event) => setValue(event.target.value)}
    />
  );
}

function ControlledSegmentSelector() {
  const [value, setValue] = useState("overview");

  return (
    <div className="flex w-full max-w-[30rem] flex-col gap-12">
      <SegmentSelector
        aria-label="انتخابگر نمای کنترل‌شده"
        items={segmentItems}
        value={value}
        onValueChange={setValue}
      />
      <p className="text-label-12 text-surface-neutral-mid-emphasis">
        انتخاب‌شده: {value}
      </p>
    </div>
  );
}

function TabsExample({
  tone,
  size,
}: {
  tone: (typeof tabsTones)[number]["value"];
  size: (typeof tabsSizes)[number];
}) {
  return (
    <Tabs defaultValue="overview" tone={tone} size={size}>
      <TabsList>
        {tabsPanels.map((panel) => (
          <TabsTrigger key={panel.value} value={panel.value}>
            {panel.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabsPanels.map((panel) => (
        <TabsContent key={panel.value} value={panel.value}>
          {panel.body}
        </TabsContent>
      ))}
    </Tabs>
  );
}

function ControlledSelect() {
  const [value, setValue] = useState<string>();

  return (
    <Select
      label="شهر"
      description={value ? `انتخاب شده: ${value}` : "برای جست‌وجو تایپ کنید."}
      leadingIcon={<MapPin />}
      placeholder="یک شهر انتخاب کنید"
      items={selectCities}
      value={value}
      onValueChange={setValue}
    />
  );
}

function DismissibleAlert({
  tone,
  title,
  body,
}: {
  tone: AlertTone;
  title: string;
  body: string;
}) {
  const [visible, setVisible] = useState(true);

  return visible ? (
    <Alert tone={tone} title={title} onDismiss={() => setVisible(false)}>
      {body}
    </Alert>
  ) : (
    <button
      className="text-label-12 text-secondary underline underline-offset-4"
      type="button"
      onClick={() => setVisible(true)}
    >
      بازگرداندن
    </button>
  );
}

function ToastSection() {
  const { toast } = useToast();

  return (
    <section className="mt-16" aria-labelledby="toast-heading">
      <div className="mb-6 flex items-baseline justify-between gap-4">
        <h2 id="toast-heading" className="text-heading-24 font-regular">
          توست
        </h2>
        <p className="text-label-12 text-surface-neutral-low-emphasis">
          ۴ رنگ‌مایه · بسته‌شدن خودکار · بسته‌شدن با کشیدن
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-12 rounded-m border border-border-low-emphasis bg-surface-background px-5 py-4">
        {toastExamples.map(({ tone, label, title, body }) => (
          <Button
            key={tone}
            variant="tertiary-outline"
            size="small"
            onClick={() => toast({ tone, title, description: body })}
          >
            {label}
          </Button>
        ))}
      </div>
    </section>
  );
}

type RadioTone = (typeof radioTones)[number]["value"];
type RadioSize = (typeof radioSizes)[number];

function RadioStateColumn({ tone, size }: { tone: RadioTone; size: RadioSize }) {
  return (
    <div className="flex flex-col items-start gap-16">
      <RadioGroup tone={tone} size={size} aria-label="انتخاب‌نشده">
        <RadioGroupItem value="a" label="انتخاب‌نشده" />
      </RadioGroup>
      <RadioGroup tone={tone} size={size} defaultValue="a" aria-label="انتخاب‌شده">
        <RadioGroupItem value="a" label="انتخاب‌شده" />
      </RadioGroup>
      <RadioGroup tone={tone} size={size} disabled aria-label="غیرفعال">
        <RadioGroupItem value="a" label="غیرفعال" />
      </RadioGroup>
      <RadioGroup tone={tone} size={size} defaultValue="a" disabled aria-label="غیرفعال و انتخاب‌شده">
        <RadioGroupItem value="a" label="غیرفعال و انتخاب‌شده" />
      </RadioGroup>
      <RadioGroup tone={tone} size={size} invalid aria-label="نامعتبر">
        <RadioGroupItem value="a" label="نامعتبر" />
      </RadioGroup>
    </div>
  );
}

function SideMenuExample() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section className="mt-16" aria-labelledby="side-menu-heading">
      <div className="mb-6 flex items-baseline justify-between gap-4">
        <h2 id="side-menu-heading" className="text-heading-24 font-regular">
          منوی کناری
        </h2>
        <p className="text-label-12 text-surface-neutral-low-emphasis">
          پنل راست‌به‌چپ · پروفایل مهمان · بستن با کلیک یا Escape
        </p>
      </div>

      <div className="rounded-m border border-border-low-emphasis bg-surface-background px-5 py-4">
        <Button onClick={() => setIsOpen(true)} size="small" variant="tertiary-outline">
          <Menu aria-hidden="true" />
          باز کردن منو
        </Button>
      </div>

      <SideMenu isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </section>
  );
}

export default function HomePage() {
  return (
    <main className="min-h-screen bg-surface-soft px-5 py-10 font-sans text-text-primary sm:px-8 sm:py-14">
      <div className="mx-auto max-w-5xl">
        <header className="mb-12 border-b border-border-low-emphasis pb-6">
          <p className="text-label-12 text-surface-neutral-low-emphasis">Kadochi</p>
          <h1 className="mt-2 text-heading-32 font-regular tracking-[-.04em]">
            کامپوننت‌ها
          </h1>
        </header>

        <section className="mb-16" aria-labelledby="top-banner-heading">
          <div className="mb-6 flex items-baseline justify-between gap-4">
            <h2 id="top-banner-heading" className="text-heading-24 font-regular">
              نوار اطلاع‌رسانی
            </h2>
            <p className="text-label-12 text-surface-neutral-low-emphasis">
              پیام مناسبتی با پیوند خرید
            </p>
          </div>

          <div className="overflow-hidden rounded-m border border-border-low-emphasis">
            <TopBanner />
          </div>
        </section>

        <section className="mb-16" aria-labelledby="price-heading">
          <div className="mb-6 flex items-baseline justify-between gap-4">
            <h2 id="price-heading" className="text-heading-24 font-regular">
              قیمت
            </h2>
            <p className="text-label-12 text-surface-neutral-low-emphasis">
              عادی · تخفیف‌دار · جمع کل · افقی و عمودی
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <PreviewFrame>
              <p className="mb-4 text-label-12 text-surface-neutral-mid-emphasis">
                قیمت عادی
              </p>
              <div className="flex flex-wrap items-center gap-16">
                <NormalPrice amount={1250000} size="L" />
                <NormalPrice amount={1250000} size="M" />
              </div>
            </PreviewFrame>

            <PreviewFrame>
              <p className="mb-4 text-label-12 text-surface-neutral-mid-emphasis">
                قیمت تخفیف‌دار
              </p>
              <div className="flex flex-col items-start gap-12">
                <Price
                  current={990000}
                  previous={1250000}
                  offPercent={21}
                  size="L"
                  orientation="vertical"
                />
                <Price
                  current={990000}
                  previous={1250000}
                  offPercent={21}
                  size="L"
                  orientation="horizontal"
                  showArrowOnLargeH
                />
              </div>
            </PreviewFrame>

            <PreviewFrame>
              <p className="mb-4 text-label-12 text-surface-neutral-mid-emphasis">
                اندازه متوسط
              </p>
              <div className="flex flex-wrap items-center gap-16">
                <DiscountPrice
                  current={990000}
                  previous={1250000}
                  offPercent={21}
                  size="M"
                  orientation="vertical"
                />
                <DiscountPrice
                  current={990000}
                  previous={1250000}
                  offPercent={21}
                  size="M"
                  orientation="horizontal"
                />
              </div>
            </PreviewFrame>

            <PreviewFrame>
              <p className="mb-4 text-label-12 text-surface-neutral-mid-emphasis">
                جمع کل
              </p>
              <div className="flex flex-col items-start gap-12">
                <SumPrice amount={2240000} />
                <SumPrice amount={2240000} separate />
                <SumPrice amount={2240000} orientation="vertical" />
              </div>
            </PreviewFrame>
          </div>
        </section>

        <section className="mb-16" aria-labelledby="product-card-heading">
          <div className="mb-6 flex items-baseline justify-between gap-4">
            <h2 id="product-card-heading" className="text-heading-24 font-regular">
              کارت محصول
            </h2>
            <p className="text-label-12 text-surface-neutral-low-emphasis">
              عادی · تخفیف‌دار · ناموجود · اسکلتون
            </p>
          </div>

          <PreviewFrame>
            <div className="grid grid-cols-2 gap-16 sm:grid-cols-4">
              {productCardExamples.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
              <ProductCardSkeleton />
            </div>
          </PreviewFrame>
        </section>

        <section className="mb-16" aria-labelledby="product-list-heading">
          <div className="mb-6 flex items-baseline justify-between gap-4">
            <h2 id="product-list-heading" className="text-heading-24 font-regular">
              فهرست محصولات
            </h2>
            <p className="text-label-12 text-surface-neutral-low-emphasis">
              شبکه واکنش‌گرا · ۲ تا ۶ ستون
            </p>
          </div>

          <div className="overflow-hidden rounded-m border border-border-low-emphasis bg-surface-background">
            <ProductList items={catalogPreviewProducts} />
          </div>
        </section>

        <section className="mb-16" aria-labelledby="products-slider-heading">
          <div className="mb-6 flex items-baseline justify-between gap-4">
            <h2 id="products-slider-heading" className="text-heading-24 font-regular">
              اسلایدر محصولات
            </h2>
            <p className="text-label-12 text-surface-neutral-low-emphasis">
              کاروسل راست‌به‌چپ · واکنش‌گرا
            </p>
          </div>

          <div className="overflow-hidden rounded-m border border-border-low-emphasis bg-surface-background py-8">
            <ProductsSlider items={catalogPreviewProducts} />
          </div>
        </section>

        <SideMenuExample />

        <section aria-labelledby="buttons-heading">
          <div className="mb-6 flex items-baseline justify-between gap-4">
            <h2 id="buttons-heading" className="text-heading-24 font-regular">
              دکمه
            </h2>
            <p className="text-label-12 text-surface-neutral-low-emphasis">
              ۶ نوع · ۳ اندازه · ۳ وضعیت
            </p>
          </div>

          <div className="overflow-x-auto rounded-m border border-border-low-emphasis bg-surface-background">
            <table className="w-full min-w-175 border-collapse text-left">
              <thead className="border-b border-border-low-emphasis">
                <tr>
                  <th scope="col" className="w-40 px-5 py-4 text-label-12 font-regular text-surface-neutral-mid-emphasis">
                    نوع
                  </th>
                  {buttonSizes.map((size) => (
                    <th key={size} scope="col" className="px-5 py-4 text-label-12 font-regular capitalize text-surface-neutral-mid-emphasis">
                      {buttonSizeLabels[size]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {buttonVariants.map(({ name, value }, index) => (
                  <tr key={value} className={index === buttonVariants.length - 1 ? "" : "border-b border-border-low-emphasis"}>
                    <th scope="row" className="whitespace-nowrap px-5 py-5 text-label-14 font-regular">
                      {name}
                    </th>
                    {buttonSizes.map((size) => (
                      <td key={size} className="px-5 py-5">
                        <div className="flex flex-col items-start gap-2">
                          <Button variant={value} size={size}>
                            <Eye aria-hidden="true" />
                            پیش‌نمایش
                          </Button>
                          <Button variant={value} size={size} disabled>
                            <Eye aria-hidden="true" />
                            غیرفعال
                          </Button>
                          <Button variant={value} size={size} loading>
                            پیش‌نمایش
                          </Button>
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-16" aria-labelledby="chip-heading">
          <div className="mb-6 flex items-baseline justify-between gap-4">
            <h2 id="chip-heading" className="text-heading-24 font-regular">
              چیپ
            </h2>
            <p className="text-label-12 text-surface-neutral-low-emphasis">
              ۲ نوع · ۲ اندازه · حالت‌های غیرفعال، متادیتا، انتخابی، قابل حذف و پیوند
            </p>
          </div>

          <div className="overflow-x-auto rounded-m border border-border-low-emphasis bg-surface-background">
            <table className="w-full min-w-175 border-collapse text-left">
              <thead className="border-b border-border-low-emphasis">
                <tr>
                  <th scope="col" className="w-40 px-5 py-4 text-label-12 font-regular text-surface-neutral-mid-emphasis">
                    نوع
                  </th>
                  {chipSizes.map((size) => (
                    <th key={size} scope="col" className="px-5 py-4 text-label-12 font-regular uppercase text-surface-neutral-mid-emphasis">
                      {size}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {chipVariants.map(({ name, value }, index) => (
                  <tr key={value} className={index === chipVariants.length - 1 ? "" : "border-b border-border-low-emphasis"}>
                    <th scope="row" className="whitespace-nowrap px-5 py-5 text-label-14 font-regular">
                      {name}
                    </th>
                    {chipSizes.map((size) => (
                      <td key={size} className="px-5 py-5 align-top">
                        <div className="flex flex-col items-start gap-12">
                          <Chip leadingIcon={value === "selected" ? <Check /> : <Tag />} size={size} variant={value}>
                            {value === "selected" ? "انتخاب شده" : "دسته‌بندی"}
                          </Chip>
                          <Chip badge="12" size={size} variant={value}>
                            همراه با نشان
                          </Chip>
                          <Chip disabled leadingIcon={<Tag />} size={size} variant={value}>
                            غیرفعال
                          </Chip>
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-12 rounded-m border border-border-low-emphasis bg-surface-background px-5 py-4">
            <Chip trailingIcon={<ExternalLink />}>آیکون انتهایی</Chip>
            <Chip selectable>انتخاب گزینه</Chip>
            <RemovableChip size="md" />
            <Chip asChild leadingIcon={<ExternalLink />} variant="selected">
              <a href="#chip-heading">نمونهٔ پیوند</a>
            </Chip>
            <Chip asChild leadingIcon={<Check />}>
              <button aria-pressed="false" type="button">کنترل فیلتر</button>
            </Chip>
          </div>
        </section>

        <section className="mt-16" aria-labelledby="label-heading">
          <div className="mb-6 flex items-baseline justify-between gap-4">
            <h2 id="label-heading" className="text-heading-24 font-regular">
              برچسب
            </h2>
            <p className="text-label-12 text-surface-neutral-low-emphasis">
              ۵ نوع · ۳ ظاهر · ۲ اندازه
            </p>
          </div>

          <div className="overflow-x-auto rounded-m border border-border-low-emphasis bg-surface-background">
            <table className="w-full min-w-225 border-collapse text-left">
              <thead className="border-b border-border-low-emphasis">
                <tr>
                  <th scope="col" className="w-40 px-5 py-4 text-label-12 font-regular text-surface-neutral-mid-emphasis">
                    نوع
                  </th>
                  {labelAppearances.map((appearance) => (
                    <th key={appearance} scope="col" className="px-5 py-4 text-label-12 font-regular capitalize text-surface-neutral-mid-emphasis">
                      {appearance}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {labelVariants.map(({ name, value }, index) => (
                  <tr key={value} className={index === labelVariants.length - 1 ? "" : "border-b border-border-low-emphasis"}>
                    <th scope="row" className="whitespace-nowrap px-5 py-5 text-label-14 font-regular">
                      {name}
                    </th>
                    {labelAppearances.map((appearance) => (
                      <td key={appearance} className="px-5 py-5">
                        <div className="flex flex-wrap items-center gap-8">
                          {labelSizes.map((size) => (
                            <Label key={size} appearance={appearance} leadingIcon={<Check />} size={size} variant={value}>
                              {size === "sm" ? "کوچک" : "متوسط"}
                            </Label>
                          ))}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-16 rounded-m border border-border-low-emphasis bg-surface-background px-5 py-4">
            <Label leadingIcon={<CircleAlert />} variant="warning">
              با آیکون
            </Label>
            <Label appearance="soft" variant="neutral">
              فقط متن
            </Label>
            <Label asChild appearance="gradient" leadingIcon={<LinkIcon />} variant="secondary">
              <a href="#label-heading">پیوند برچسب</a>
            </Label>
            <Label className="uppercase tracking-wide" variant="danger">
              کلاس دلخواه
            </Label>
          </div>
        </section>

        <section className="mt-16" aria-labelledby="divider-heading">
          <div className="mb-6 flex items-baseline justify-between gap-4">
            <h2 id="divider-heading" className="text-heading-24 font-regular">
              جداکننده
            </h2>
            <p className="text-label-12 text-surface-neutral-low-emphasis">
              نوع خطی و فاصله‌گذار · پیکربندی فاصله‌دار · ۳ اندازه فاصله‌گذار
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <PreviewFrame>
              <p className="mb-4 text-label-12 text-surface-neutral-mid-emphasis">
                خط تمام‌عرض (پیش‌فرض)
              </p>
              <Divider />
            </PreviewFrame>

            <PreviewFrame>
              <p className="mb-4 text-label-12 text-surface-neutral-mid-emphasis">
                خط با فاصله
              </p>
              <Divider inset />
            </PreviewFrame>
          </div>

          <div className="mt-4 overflow-x-auto rounded-m border border-border-low-emphasis bg-surface-background">
            <table className="w-full min-w-175 border-collapse text-left">
              <thead className="border-b border-border-low-emphasis">
                <tr>
                  <th scope="col" className="w-40 px-5 py-4 text-label-12 font-regular text-surface-neutral-mid-emphasis">
                    اندازه فاصله‌گذار
                  </th>
                  <th scope="col" className="px-5 py-4 text-label-12 font-regular text-surface-neutral-mid-emphasis">
                    تمام عرض
                  </th>
                  <th scope="col" className="px-5 py-4 text-label-12 font-regular text-surface-neutral-mid-emphasis">
                    فاصله‌دار
                  </th>
                </tr>
              </thead>
              <tbody>
                {dividerSpacerSizes.map((size, index) => (
                  <tr
                    key={size}
                    className={
                      index === dividerSpacerSizes.length - 1
                        ? ""
                        : "border-b border-border-low-emphasis"
                    }
                  >
                    <th scope="row" className="px-5 py-5 text-label-14 font-regular uppercase">
                      {size}
                    </th>
                    <td className="px-5 py-5">
                      <Divider variant="spacer" size={size} />
                    </td>
                    <td className="px-5 py-5">
                      <Divider inset size={size} variant="spacer" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-16" aria-labelledby="accordion-heading">
          <div className="mb-6 flex items-baseline justify-between gap-4">
            <h2 id="accordion-heading" className="text-heading-24 font-regular">
              آکاردئون
            </h2>
            <p className="text-label-12 text-surface-neutral-low-emphasis">
              ۲ نوع · ۳ اندازه · حالت‌های باز، بسته، غیرفعال، کنترل‌شده و چندتایی
            </p>
          </div>

          <div className="overflow-x-auto rounded-m border border-border-low-emphasis bg-surface-background">
            <table className="w-full min-w-[68rem] border-collapse text-left">
              <thead className="border-b border-border-low-emphasis">
                <tr>
                  <th scope="col" className="w-40 px-5 py-4 text-label-12 font-regular text-surface-neutral-mid-emphasis">
                    نوع
                  </th>
                  {accordionSizes.map((size) => (
                    <th key={size} scope="col" className="px-5 py-4 text-label-12 font-regular uppercase text-surface-neutral-mid-emphasis">
                      {size}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {accordionVariants.map(({ name, value }, index) => (
                  <tr key={value} className={index === accordionVariants.length - 1 ? "" : "border-b border-border-low-emphasis"}>
                    <th scope="row" className="whitespace-nowrap px-5 py-5 text-label-14 font-regular">
                      {name}
                    </th>
                    {accordionSizes.map((size) => (
                      <td key={size} className="min-w-[18rem] px-5 py-5 align-top">
                        <Accordion
                          defaultValue={["payment"]}
                          items={accordionItems}
                          size={size}
                          variant={value}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 grid gap-16 rounded-m border border-border-low-emphasis bg-surface-background px-5 py-4 lg:grid-cols-3">
            <div className="flex flex-col gap-12">
              <span className="text-label-12 text-surface-neutral-mid-emphasis">
                همه بسته
              </span>
              <Accordion items={accordionItems} />
            </div>
            <div className="flex flex-col gap-12">
              <span className="text-label-12 text-surface-neutral-mid-emphasis">
                چند مورد باز
              </span>
              <Accordion
                defaultValue={["shipping", "payment"]}
                items={accordionItems}
                type="multiple"
              />
            </div>
            <div className="flex flex-col gap-12">
              <span className="text-label-12 text-surface-neutral-mid-emphasis">
                کنترل‌شده
              </span>
              <ControlledAccordion />
            </div>
          </div>

          <div className="mt-4 max-w-sm rounded-m border border-border-low-emphasis bg-surface-background px-5 py-4">
            <span className="text-label-12 text-surface-neutral-mid-emphasis">چیدمان چپ‌به‌راست</span>
            <Accordion
              className="mt-12"
              dir="ltr"
              items={[
                {
                  value: "support",
                  title: "How can I contact support?",
                  content: "Our support team is available by chat every day from 9:00 to 21:00.",
                },
              ]}
            />
          </div>
        </section>

        <section className="mt-16" aria-labelledby="bottom-sheet-heading">
          <div className="mb-6 flex items-baseline justify-between gap-4">
            <h2 id="bottom-sheet-heading" className="text-heading-24 font-regular">
              باتم‌شیت
            </h2>
            <p className="text-label-12 text-surface-neutral-low-emphasis">
              ۳ اندازه · پیکربندی دستگیره · حالت‌های کنترل‌شده و کنترل‌نشده
            </p>
          </div>

          <div className="overflow-x-auto rounded-m border border-border-low-emphasis bg-surface-background">
            <table className="w-full min-w-[48rem] border-collapse text-left">
              <thead className="border-b border-border-low-emphasis">
                <tr>
                  <th className="w-48 px-5 py-4 text-label-12 font-regular text-surface-neutral-mid-emphasis" scope="col">
                    پیکربندی
                  </th>
                  {bottomSheetSizes.map((size) => (
                    <th className="px-5 py-4 text-label-12 font-regular uppercase text-surface-neutral-mid-emphasis" key={size} scope="col">
                      {size}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border-low-emphasis">
                  <th className="px-5 py-5 text-label-14 font-regular" scope="row">
                    با دستگیره
                  </th>
                  {bottomSheetSizes.map((size) => (
                    <td className="px-5 py-5" key={size}>
                      <SheetExample size={size} />
                    </td>
                  ))}
                </tr>
                <tr>
                  <th className="px-5 py-5 text-label-14 font-regular" scope="row">
                    بدون دستگیره
                  </th>
                  {bottomSheetSizes.map((size) => (
                    <td className="px-5 py-5" key={size}>
                      <SheetExample showHandle={false} size={size} />
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-4 rounded-m border border-border-low-emphasis bg-surface-background px-5 py-4">
            <p className="mb-12 text-label-12 text-surface-neutral-mid-emphasis">
              وضعیت کنترل‌شده و اکشن‌های بستن دلخواه
            </p>
            <ControlledSheetExample />
          </div>
        </section>

        <section className="mt-16" aria-labelledby="toggle-heading">
          <div className="mb-6 flex items-baseline justify-between gap-4">
            <h2 id="toggle-heading" className="text-heading-24 font-regular">
              سوییچ
            </h2>
            <p className="text-label-12 text-surface-neutral-low-emphasis">
              ۲ رنگ‌مایه · ۲ اندازه · حالت‌های انتخاب‌شده و غیرفعال
            </p>
          </div>

          <div className="overflow-x-auto rounded-m border border-border-low-emphasis bg-surface-background">
            <table className="w-full min-w-175 border-collapse text-left">
              <thead className="border-b border-border-low-emphasis">
                <tr>
                  <th scope="col" className="w-40 px-5 py-4 text-label-12 font-regular text-surface-neutral-mid-emphasis">
                    رنگ‌مایه
                  </th>
                  {toggleSizes.map((size) => (
                    <th key={size} scope="col" className="px-5 py-4 text-label-12 font-regular uppercase text-surface-neutral-mid-emphasis">
                      {size}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {toggleTones.map(({ name, value }, index) => (
                  <tr key={value} className={index === toggleTones.length - 1 ? "" : "border-b border-border-low-emphasis"}>
                    <th scope="row" className="whitespace-nowrap px-5 py-5 text-label-14 font-regular">
                      {name}
                    </th>
                    {toggleSizes.map((size) => (
                      <td key={size} className="px-5 py-5 align-top">
                        <div className="flex flex-col items-start gap-16">
                          <Toggle tone={value} size={size} label="خاموش" />
                          <Toggle tone={value} size={size} defaultChecked label="روشن" />
                          <Toggle tone={value} size={size} disabled label="غیرفعال (خاموش)" />
                          <Toggle tone={value} size={size} defaultChecked disabled label="غیرفعال (روشن)" />
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-32 gap-y-16 rounded-m border border-border-low-emphasis bg-surface-background px-5 py-4">
            <Toggle aria-label="سوییچ بدون برچسب نمایانی" />
            <Toggle defaultChecked name="notifications" label="کنترل‌نشده" />
            <ControlledToggle />
            <Toggle label={<><span className="font-bold">متنوع</span> با محتوای برچسب</>} />
          </div>
        </section>

        <section className="mt-16" aria-labelledby="input-stepper-heading">
          <div className="mb-6 flex items-baseline justify-between gap-4">
            <h2 id="input-stepper-heading" className="text-heading-24 font-regular">
              شمارشگر عددی
            </h2>
            <p className="text-label-12 text-surface-neutral-low-emphasis">
              ۲ نوع · ۲ اندازه · حالت‌های فعال، حداقل، حداکثر و غیرفعال
            </p>
          </div>

          <div className="overflow-x-auto rounded-m border border-border-low-emphasis bg-surface-background">
            <table className="w-full min-w-175 border-collapse text-left">
              <thead className="border-b border-border-low-emphasis">
                <tr>
                  <th scope="col" className="w-40 px-5 py-4 text-label-12 font-regular text-surface-neutral-mid-emphasis">
                    نوع
                  </th>
                  {stepperSizes.map((size) => (
                    <th key={size} scope="col" className="px-5 py-4 text-label-12 font-regular uppercase text-surface-neutral-mid-emphasis">
                      {size}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stepperVariants.map(({ name, value: variant }, index) => (
                  <tr
                    key={variant}
                    className={
                      index === stepperVariants.length - 1
                        ? ""
                        : "border-b border-border-low-emphasis"
                    }
                  >
                    <th scope="row" className="whitespace-nowrap px-5 py-5 text-label-14 font-regular">
                      {name}
                    </th>
                    {stepperSizes.map((size) => (
                      <td key={size} className="px-5 py-5 align-top">
                        <div className="flex flex-col items-start gap-16" dir="rtl">
                          <StepperDemo
                            initialValue={2}
                            max={5}
                            size={size}
                            variant={variant}
                          />
                          <StepperDemo
                            initialValue={1}
                            max={5}
                            removable
                            size={size}
                            variant={variant}
                          />
                          <StepperDemo
                            initialValue={5}
                            max={5}
                            size={size}
                            variant={variant}
                          />
                          <StepperDemo
                            disabled
                            initialValue={2}
                            max={5}
                            size={size}
                            variant={variant}
                          />
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-16 rounded-m border border-border-low-emphasis bg-surface-background px-5 py-4" dir="rtl">
            <div className="flex flex-col gap-2">
              <span className="text-label-12 text-surface-neutral-mid-emphasis">
                کنترل‌نشده · بازه و پله دلخواه
              </span>
              <InputStepper defaultValue={6} max={10} min={2} step={2} />
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-label-12 text-surface-neutral-mid-emphasis">
                کنترل‌شده
              </span>
              <StepperDemo initialValue={3} max={8} />
            </div>
          </div>
        </section>

        <section className="mt-16" aria-labelledby="progress-stepper-heading">
          <div className="mb-6 flex items-baseline justify-between gap-4">
            <h2 id="progress-stepper-heading" className="text-heading-24 font-regular">
              نوار مراحل
            </h2>
            <p className="text-label-12 text-surface-neutral-low-emphasis">
              ۳ اندازه · افقی و عمودی · حالت‌های تکمیل‌شده، جاری، آینده و غیرفعال
            </p>
          </div>

          <div className="overflow-x-auto rounded-m border border-border-low-emphasis bg-surface-background">
            <table className="w-full min-w-[56.25rem] border-collapse text-left">
              <thead className="border-b border-border-low-emphasis">
                <tr>
                  <th
                    scope="col"
                    className="w-44 px-5 py-4 text-label-12 font-regular text-surface-neutral-mid-emphasis"
                  >
                    وضعیت
                  </th>
                  {progressStepperSizes.map((size) => (
                    <th
                      key={size}
                      scope="col"
                      className="px-5 py-4 text-label-12 font-regular uppercase text-surface-neutral-mid-emphasis"
                    >
                      {size}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {progressStepperStates.map(({ name, steps, value }, index) => (
                  <tr
                    key={name}
                    className={index === progressStepperStates.length - 1 ? "" : "border-b border-border-low-emphasis"}
                  >
                    <th scope="row" className="whitespace-nowrap px-5 py-5 text-label-14 font-regular">
                      {name}
                    </th>
                    {progressStepperSizes.map((size) => (
                      <td key={size} className="min-w-96 px-5 py-5 align-top">
                        <ProgressStepper size={size} steps={steps} value={value} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 grid gap-4 rounded-m border border-border-low-emphasis bg-surface-background p-5 md:grid-cols-2">
            <div className="min-w-0">
              <p className="mb-4 text-label-12 text-surface-neutral-mid-emphasis">
                عمودی همراه با محتوای توضیحی
              </p>
              <ProgressStepper
                orientation="vertical"
                steps={[
                  { label: "ثبت‌نام", description: "حساب شما ساخته شد" },
                  { label: "تأیید شماره", description: "کد را وارد کنید" },
                  { label: "تکمیل پروفایل" },
                ]}
                value={1}
              />
            </div>

            <div className="min-w-0">
              <p className="mb-4 text-label-12 text-surface-neutral-mid-emphasis">
                بدون نمایش شماره · چیدمان چپ‌به‌راست
              </p>
              <ProgressStepper
                dir="ltr"
                showStepNumber={false}
                steps={[
                  { label: "Account" },
                  { label: "Verification" },
                  { label: "Finish" },
                ]}
                value={1}
              />
            </div>
          </div>
        </section>

        <section className="mt-16" aria-labelledby="textarea-heading">
          <div className="mb-6 flex items-baseline justify-between gap-4">
            <h2 id="textarea-heading" className="text-heading-24 font-regular">
              ناحیه متنی
            </h2>
            <p className="text-label-12 text-surface-neutral-low-emphasis">
              ۳ اندازه · حالت‌های پیش‌فرض، خطا، موفقیت، غیرفعال و فوکوس
            </p>
          </div>

          <div className="overflow-x-auto rounded-m border border-border-low-emphasis bg-surface-background">
            <table className="w-full min-w-250 border-collapse text-left">
              <thead className="border-b border-border-low-emphasis">
                <tr>
                  <th scope="col" className="w-40 px-5 py-4 text-label-12 font-regular text-surface-neutral-mid-emphasis">
                    وضعیت
                  </th>
                  {textareaSizes.map((size) => (
                    <th key={size} scope="col" className="px-5 py-4 text-label-12 font-regular uppercase text-surface-neutral-mid-emphasis">
                      {size}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {textareaStates.map(({ name, props }, index) => (
                  <tr
                    key={name}
                    className={index === textareaStates.length - 1 ? "" : "border-b border-border-low-emphasis"}
                  >
                    <th scope="row" className="whitespace-nowrap px-5 py-5 align-top text-label-14 font-regular">
                      {name}
                    </th>
                    {textareaSizes.map((size) => (
                      <td key={size} className="min-w-80 px-5 py-5 align-top">
                        <TextArea {...props} placeholder="توضیحی بنویسید..." size={size} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 grid gap-16 rounded-m border border-border-low-emphasis bg-surface-background p-5 md:grid-cols-2">
            <ControlledCountExample />
            <TextArea
              defaultValue="جزئیات مهم را وارد کنید."
              description="آیکون ابتدایی و چیدمان چپ‌به‌راست."
              dir="ltr"
              label="یادداشت‌ها"
              leadingIcon={<MessageSquare />}
              placeholder="یادداشتی اضافه کنید..."
              showCount
            />
            <TextArea
              description="یک نام قابل‌دسترس می‌تواند جایگزین برچسب نمایانی شود."
              aria-label="یادداشت داخلی"
              leadingIcon={<Info />}
              placeholder="یادداشت داخلی..."
              size="sm"
            />
          </div>
        </section>

        <section className="mt-16" aria-labelledby="input-heading">
          <div className="mb-6 flex items-baseline justify-between gap-4">
            <h2 id="input-heading" className="text-heading-24 font-regular">
              ورودی متن
            </h2>
            <p className="text-label-12 text-surface-neutral-low-emphasis">
              ۳ اندازه · حالت‌های پیش‌فرض، خطا، موفقیت، غیرفعال و فوکوس
            </p>
          </div>

          <div className="overflow-x-auto rounded-m border border-border-low-emphasis bg-surface-background">
            <table className="w-full min-w-250 border-collapse text-left">
              <thead className="border-b border-border-low-emphasis">
                <tr>
                  <th scope="col" className="w-40 px-5 py-4 text-label-12 font-regular text-surface-neutral-mid-emphasis">
                    وضعیت
                  </th>
                  {inputSizes.map((size) => (
                    <th key={size} scope="col" className="px-5 py-4 text-label-12 font-regular uppercase text-surface-neutral-mid-emphasis">
                      {size}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {inputStates.map(({ name, props }, index) => (
                  <tr
                    key={name}
                    className={index === inputStates.length - 1 ? "" : "border-b border-border-low-emphasis"}
                  >
                    <th scope="row" className="whitespace-nowrap px-5 py-5 align-top text-label-14 font-regular">
                      {name}
                    </th>
                    {inputSizes.map((size) => (
                      <td key={size} className="min-w-80 px-5 py-5 align-top">
                        <Input {...props} placeholder="مقداری وارد کنید..." size={size} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 grid gap-16 rounded-m border border-border-low-emphasis bg-surface-background p-5 md:grid-cols-2">
            <ControlledInputExample />
            <Input
              defaultValue="sahar@example.com"
              description="آیکون ابتدایی و انتهایی همراه با محتوای چپ‌به‌راست."
              dir="ltr"
              label="آدرس ایمیل"
              leadingIcon={<AtSign />}
              trailingIcon={<Eye />}
              type="email"
            />
            <Input
              description="propهای بومی ورودی، مانند تکمیل خودکار و حالت ورودی، به‌طور کامل پاس داده می‌شوند."
              inputMode="numeric"
              label="کد تأیید"
              placeholder="123456"
              autoComplete="one-time-code"
            />
            <Input
              aria-label="رمز عبور بدون برچسب نمایانی"
              leadingIcon={<LockKeyhole />}
              placeholder="رمز عبور"
              type="password"
              size="sm"
            />
          </div>
        </section>

        <section className="mt-16" aria-labelledby="segment-selector-heading">
          <div className="mb-6 flex items-baseline justify-between gap-4">
            <h2 id="segment-selector-heading" className="text-heading-24 font-regular">
              سلکتور بخش‌بندی
            </h2>
            <p className="text-label-12 text-surface-neutral-low-emphasis">
              ۲ رنگ‌مایه · ۳ اندازه · حالت‌های انتخاب‌شده، غیرفعال، کنترل‌شده و فرم
            </p>
          </div>

          <div className="overflow-x-auto rounded-m border border-border-low-emphasis bg-surface-background">
            <table className="w-full min-w-[56.25rem] border-collapse text-left">
              <thead className="border-b border-border-low-emphasis">
                <tr>
                  <th scope="col" className="w-40 px-5 py-4 text-label-12 font-regular text-surface-neutral-mid-emphasis">
                    رنگ‌مایه
                  </th>
                  {segmentSizes.map((size) => (
                    <th key={size} scope="col" className="px-5 py-4 text-label-12 font-regular uppercase text-surface-neutral-mid-emphasis">
                      {size}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {segmentTones.map(({ name, value }, index) => (
                  <tr key={value} className={index === segmentTones.length - 1 ? "" : "border-b border-border-low-emphasis"}>
                    <th scope="row" className="whitespace-nowrap px-5 py-5 text-label-14 font-regular">
                      {name}
                    </th>
                    {segmentSizes.map((size) => (
                      <td key={size} className="px-5 py-5 align-top">
                        <div className="flex min-w-[16rem] flex-col gap-16">
                          <SegmentSelector
                            aria-label={`سلکتور بخش‌بندی ${name} با اندازه ${size}`}
                            defaultValue="overview"
                            items={segmentItems}
                            size={size}
                            tone={value}
                          />
                          <SegmentSelector
                            aria-label={`سلکتور بخش‌بندی ${name} با اندازه ${size} و گزینه‌های غیرفعال`}
                            defaultValue="activity"
                            items={[
                              { value: "overview", label: "نمای کلی" },
                              { value: "activity", label: "فعالیت", disabled: true },
                              { value: "settings", label: "تنظیمات", disabled: true },
                            ]}
                            size={size}
                            tone={value}
                          />
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 grid gap-16 rounded-m border border-border-low-emphasis bg-surface-background px-5 py-4 sm:grid-cols-2">
            <div className="flex flex-col gap-12">
              <span className="text-label-12 text-surface-neutral-mid-emphasis">انتخاب‌نشده</span>
              <SegmentSelector
                aria-label="سلکتور بدون انتخاب"
                className="max-w-[16rem]"
                items={[
                  { value: "list", label: "فهرست" },
                  { value: "grid", label: "شبکه" },
                ]}
              />
            </div>
            <div className="flex flex-col gap-12">
              <span className="text-label-12 text-surface-neutral-mid-emphasis">کنترل‌شده</span>
              <ControlledSegmentSelector />
            </div>
            <form className="flex flex-col gap-12" onSubmit={(event) => event.preventDefault()}>
              <span className="text-label-12 text-surface-neutral-mid-emphasis">فیلد فرم</span>
              <SegmentSelector
                aria-label="ترجیح ارسال"
                defaultValue="courier"
                items={[
                  { value: "courier", label: "پیک" },
                  { value: "pickup", label: "دریافت حضوری" },
                ]}
                name="delivery"
                required
              />
            </form>
            <div className="flex flex-col gap-12">
              <span className="text-label-12 text-surface-neutral-mid-emphasis">راست‌به‌چپ</span>
              <SegmentSelector
                aria-label="روش نمایش"
                defaultValue="list"
                items={[
                  { value: "list", label: "فهرست" },
                  { value: "grid", label: "شبکه" },
                ]}
              />
            </div>
          </div>
        </section>

        <section className="mt-16" aria-labelledby="tabs-heading">
          <div className="mb-6 flex items-baseline justify-between gap-4">
            <h2 id="tabs-heading" className="text-heading-24 font-regular">
              تب‌ها
            </h2>
            <p className="text-label-12 text-surface-neutral-low-emphasis">
              ۲ رنگ‌مایه · ۳ اندازه · پنل‌ها · ناوبری راست‌به‌چپ با صفحه‌کلید
            </p>
          </div>

          <div className="overflow-x-auto rounded-m border border-border-low-emphasis bg-surface-background">
            <table className="w-full min-w-[56.25rem] border-collapse text-left">
              <thead className="border-b border-border-low-emphasis">
                <tr>
                  <th scope="col" className="w-40 px-5 py-4 text-label-12 font-regular text-surface-neutral-mid-emphasis">
                    رنگ‌مایه
                  </th>
                  {tabsSizes.map((size) => (
                    <th key={size} scope="col" className="px-5 py-4 text-label-12 font-regular uppercase text-surface-neutral-mid-emphasis">
                      {size}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tabsTones.map(({ name, value }, index) => (
                  <tr key={value} className={index === tabsTones.length - 1 ? "" : "border-b border-border-low-emphasis"}>
                    <th scope="row" className="whitespace-nowrap px-5 py-5 text-label-14 font-regular">
                      {name}
                    </th>
                    {tabsSizes.map((size) => (
                      <td key={size} className="px-5 py-5 align-top">
                        <div className="min-w-[16rem]">
                          <TabsExample tone={value} size={size} />
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-16" aria-labelledby="select-heading">
          <div className="mb-6 flex items-baseline justify-between gap-4">
            <h2 id="select-heading" className="text-heading-24 font-regular">
              سلکت‌باکس
            </h2>
            <p className="text-label-12 text-surface-neutral-low-emphasis">
              ۳ اندازه · پیش‌فرض، خطا، موفقیت، غیرفعال · منوی راست‌به‌چپ
            </p>
          </div>

          <div className="overflow-x-auto rounded-m border border-border-low-emphasis bg-surface-background">
            <table className="w-full min-w-250 border-collapse text-left">
              <thead className="border-b border-border-low-emphasis">
                <tr>
                  <th scope="col" className="w-40 px-5 py-4 text-label-12 font-regular text-surface-neutral-mid-emphasis">
                    وضعیت
                  </th>
                  {selectSizes.map((size) => (
                    <th key={size} scope="col" className="px-5 py-4 text-label-12 font-regular uppercase text-surface-neutral-mid-emphasis">
                      {size}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {selectStates.map(({ name, props }, index) => (
                  <tr key={name} className={index === selectStates.length - 1 ? "" : "border-b border-border-low-emphasis"}>
                    <th scope="row" className="whitespace-nowrap px-5 py-5 align-top text-label-14 font-regular">
                      {name}
                    </th>
                    {selectSizes.map((size) => (
                      <td key={size} className="min-w-80 px-5 py-5 align-top">
                        <Select
                          label="شهر"
                          placeholder="انتخاب کنید"
                          items={selectCities}
                          size={size}
                          {...props}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 grid gap-16 rounded-m border border-border-low-emphasis bg-surface-background p-5 md:grid-cols-2">
            <ControlledSelect />
            <Select
              leadingIcon={<MapPin />}
              aria-label="شهر بدون برچسب"
              placeholder="بدون برچسب"
              items={selectCities}
            />
          </div>
        </section>

        <section className="mt-16" aria-labelledby="dropdown-menu-heading">
          <div className="mb-6 flex items-baseline justify-between gap-4">
            <h2 id="dropdown-menu-heading" className="text-heading-24 font-regular">
              منوی کشویی
            </h2>
            <p className="text-label-12 text-surface-neutral-low-emphasis">
              فعال‌سازی با دکمه · آیکون · آیتم خطر · جداکننده
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-16 rounded-m border border-border-low-emphasis bg-surface-background px-5 py-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="tertiary-outline" size="small">
                  <Ellipsis aria-hidden="true" />
                  گزینه‌ها
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuLabel>عملیات</DropdownMenuLabel>
                <DropdownMenuItem>
                  <Pencil aria-hidden="true" />
                  ویرایش
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Copy aria-hidden="true" />
                  کپی
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Share2 aria-hidden="true" />
                  اشتراک‌گذاری
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem tone="danger">
                  <Trash2 aria-hidden="true" />
                  حذف
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary-tonal" size="small">
                  منوی حساب
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem>پروفایل</DropdownMenuItem>
                <DropdownMenuItem>تنظیمات</DropdownMenuItem>
                <DropdownMenuItem disabled>صورتحساب (به‌زودی)</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem tone="danger">خروج</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </section>

        <section className="mt-16" aria-labelledby="alert-heading">
          <div className="mb-6 flex items-baseline justify-between gap-4">
            <h2 id="alert-heading" className="text-heading-24 font-regular">
              پیام هشدار
            </h2>
            <p className="text-label-12 text-surface-neutral-low-emphasis">
              ۴ رنگ‌مایه · عنوان + توضیح · قابل بستن
            </p>
          </div>

          <div className="grid gap-16 rounded-m border border-border-low-emphasis bg-surface-background p-5 md:grid-cols-2">
            {alertTones.map(({ tone, title, body }) => (
              <Alert key={tone} tone={tone} title={title}>
                {body}
              </Alert>
            ))}
            {alertTones.map(({ tone, title, body }) => (
              <DismissibleAlert key={`${tone}-dismiss`} tone={tone} title={title} body={body} />
            ))}
          </div>
        </section>

        <ToastSection />

        <section className="mt-16" aria-labelledby="avatar-heading">
          <div className="mb-6 flex items-baseline justify-between gap-4">
            <h2 id="avatar-heading" className="text-heading-24 font-regular">
              آواتار
            </h2>
            <p className="text-label-12 text-surface-neutral-low-emphasis">
              ۴ اندازه · حالت‌های تصویر، حروف اول و جایگزین
            </p>
          </div>

          <div className="overflow-x-auto rounded-m border border-border-low-emphasis bg-surface-background">
            <table className="w-full min-w-175 border-collapse text-left">
              <thead className="border-b border-border-low-emphasis">
                <tr>
                  <th scope="col" className="w-40 px-5 py-4 text-label-12 font-regular text-surface-neutral-mid-emphasis">
                    پیکربندی
                  </th>
                  {avatarSizes.map((size) => (
                    <th key={size} scope="col" className="px-5 py-4 text-label-12 font-regular uppercase text-surface-neutral-mid-emphasis">
                      {size}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {avatarExamples.map(({ name, render }, index) => (
                  <tr key={name} className={index === avatarExamples.length - 1 ? "" : "border-b border-border-low-emphasis"}>
                    <th scope="row" className="whitespace-nowrap px-5 py-5 text-label-14 font-regular">
                      {name}
                    </th>
                    {avatarSizes.map((size) => (
                      <td key={size} className="px-5 py-5">
                        {render(size)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-16 rounded-m border border-border-low-emphasis bg-surface-background px-5 py-4">
            <Avatar alt="One name" />
            <Avatar aria-label="آواتار تزئینی با برچسب" fallback="A" />
            <Avatar alt="بازگشت به جایگزین در صورت خطای تصویر" src="/missing-avatar.png" />
          </div>
        </section>

        <section className="mt-16" aria-labelledby="checkbox-heading">
          <div className="mb-6 flex items-baseline justify-between gap-4">
            <h2 id="checkbox-heading" className="text-heading-24 font-regular">
              چک‌باکس
            </h2>
            <p className="text-label-12 text-surface-neutral-low-emphasis">
              ۲ رنگ‌مایه · ۲ اندازه · حالت‌های انتخاب‌شده، غیرفعال و نامعتبر
            </p>
          </div>

          <div className="overflow-x-auto rounded-m border border-border-low-emphasis bg-surface-background">
            <table className="w-full min-w-175 border-collapse text-left">
              <thead className="border-b border-border-low-emphasis">
                <tr>
                  <th scope="col" className="w-40 px-5 py-4 text-label-12 font-regular text-surface-neutral-mid-emphasis">
                    رنگ‌مایه
                  </th>
                  {checkboxSizes.map((size) => (
                    <th key={size} scope="col" className="px-5 py-4 text-label-12 font-regular capitalize text-surface-neutral-mid-emphasis">
                      {size}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {checkboxTones.map(({ name, value }, index) => (
                  <tr key={value} className={index === checkboxTones.length - 1 ? "" : "border-b border-border-low-emphasis"}>
                    <th scope="row" className="whitespace-nowrap px-5 py-5 text-label-14 font-regular">
                      {name}
                    </th>
                    {checkboxSizes.map((size) => (
                      <td key={size} className="px-5 py-5 align-top">
                        <div className="flex flex-col items-start gap-16">
                          <Checkbox tone={value} size={size} label="انتخاب‌نشده" />
                          <Checkbox tone={value} size={size} defaultChecked label="انتخاب‌شده" />
                          <Checkbox tone={value} size={size} disabled label="غیرفعال" />
                          <Checkbox tone={value} size={size} defaultChecked disabled label="غیرفعال و انتخاب‌شده" />
                          <Checkbox tone={value} size={size} invalid label="نامعتبر" />
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-32 gap-y-16 rounded-m border border-border-low-emphasis bg-surface-background px-5 py-4">
            <Checkbox aria-label="چک‌باکس بدون برچسب نمایانی" />
            <Checkbox name="terms" required label="فیلد الزامی" />
            <Checkbox defaultChecked label={<><span className="font-bold">متنوع</span> با محتوای برچسب</>} />
          </div>
        </section>

        <section className="mt-16" aria-labelledby="radio-heading">
          <div className="mb-6 flex items-baseline justify-between gap-4">
            <h2 id="radio-heading" className="text-heading-24 font-regular">
              رادیو باتن
            </h2>
            <p className="text-label-12 text-surface-neutral-low-emphasis">
              ۲ رنگ‌مایه · ۲ اندازه · حالت‌های انتخاب‌شده، غیرفعال و نامعتبر
            </p>
          </div>

          <div className="overflow-x-auto rounded-m border border-border-low-emphasis bg-surface-background">
            <table className="w-full min-w-175 border-collapse text-left">
              <thead className="border-b border-border-low-emphasis">
                <tr>
                  <th scope="col" className="w-40 px-5 py-4 text-label-12 font-regular text-surface-neutral-mid-emphasis">
                    رنگ‌مایه
                  </th>
                  {radioSizes.map((size) => (
                    <th key={size} scope="col" className="px-5 py-4 text-label-12 font-regular capitalize text-surface-neutral-mid-emphasis">
                      {size}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {radioTones.map(({ name, value }, index) => (
                  <tr key={value} className={index === radioTones.length - 1 ? "" : "border-b border-border-low-emphasis"}>
                    <th scope="row" className="whitespace-nowrap px-5 py-5 text-label-14 font-regular">
                      {name}
                    </th>
                    {radioSizes.map((size) => (
                      <td key={size} className="px-5 py-5 align-top">
                        <RadioStateColumn tone={value} size={size} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 rounded-m border border-border-low-emphasis bg-surface-background px-5 py-4">
            <RadioGroup
              name="terms"
              required
              defaultValue="agree"
              aria-label="گزینه‌های رضایت"
              className="flex-row flex-wrap gap-x-32 gap-y-16"
            >
              <RadioGroupItem value="agree" label="فیلد الزامی" />
              <RadioGroupItem
                value="rich"
                label={<><span className="font-bold">متنوع</span> با محتوای برچسب</>}
              />
              <RadioGroupItem value="plain" aria-label="رادیو باتن بدون برچسب نمایانی" />
            </RadioGroup>
          </div>

          <fieldset className="mt-4 rounded-m border border-border-low-emphasis bg-surface-background px-5 py-4">
            <legend className="sr-only">ترجیح اطلاع‌رسانی</legend>
            <RadioGroup
              name="notification"
              defaultValue="email"
              aria-label="ترجیح اطلاع‌رسانی"
              className="flex-row flex-wrap gap-x-32 gap-y-16"
            >
              <RadioGroupItem value="email" label="ایمیل" />
              <RadioGroupItem value="sms" label="پیامک" />
              <RadioGroupItem
                value="push"
                label={<><span className="font-bold">اعلان‌های</span> فوری</>}
              />
              <RadioGroupItem value="disabled" disabled label="گزینه غیرفعال" />
            </RadioGroup>
          </fieldset>
        </section>

        <section className="mt-16" aria-labelledby="breadcrumb-heading">
          <div className="mb-6 flex items-baseline justify-between gap-4">
            <h2 id="breadcrumb-heading" className="text-heading-24 font-regular">
              بردکرامب
            </h2>
            <p className="text-label-12 text-surface-neutral-low-emphasis">
              راست‌به‌چپ · اسکرول افقی · منوی جمع‌شده در صورت طولانی بودن مسیر
            </p>
          </div>

          <div className="overflow-hidden rounded-m border border-border-low-emphasis bg-surface-background">
            {breadcrumbExamples.map(({ name, items, maxItems }, index) => (
              <div
                key={name}
                className={
                  index === breadcrumbExamples.length - 1
                    ? ""
                    : "border-b border-border-low-emphasis"
                }
              >
                <p className="px-5 pt-5 text-label-12 font-regular text-surface-neutral-mid-emphasis">
                  {name}
                </p>
                <Breadcrumb items={items} maxItems={maxItems} />
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
