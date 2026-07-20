"use client";

import {
  createContext,
  forwardRef,
  useContext,
  type ComponentPropsWithoutRef,
  type ComponentRef,
} from "react";
import { Tabs as TabsPrimitive } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const tabsTriggerVariants = cva(
  [
    "group relative flex min-w-0 flex-1 cursor-pointer items-center justify-center whitespace-nowrap rounded-rounded bg-surface-background px-16 text-label-14 font-regular text-surface-neutral-high-emphasis",
    "transition-all duration-[250ms] ease",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset",
    "disabled:cursor-not-allowed disabled:bg-disable-container disabled:text-on-disable",
  ],
  {
    variants: {
      tone: {
        primary: [
          "enabled:hover:bg-surface",
          "data-[state=active]:bg-primary data-[state=active]:text-on-primary",
          "focus-visible:ring-primary/40",
        ],
        secondary: [
          "enabled:hover:bg-surface",
          "data-[state=active]:bg-secondary data-[state=active]:text-on-secondary",
          "focus-visible:ring-secondary/40",
        ],
      },
      size: {
        sm: "py-8",
        md: "py-12",
        lg: "py-16",
      },
    },
    defaultVariants: {
      tone: "secondary",
      size: "md",
    },
  },
);

type TabsContextValue = Pick<
  VariantProps<typeof tabsTriggerVariants>,
  "tone" | "size"
>;

const TabsContext = createContext<TabsContextValue>({});

type TabsProps = Omit<
  ComponentPropsWithoutRef<typeof TabsPrimitive.Root>,
  "asChild"
> &
  TabsContextValue;

const Tabs = forwardRef<ComponentRef<typeof TabsPrimitive.Root>, TabsProps>(
  function Tabs({ className, tone, size, dir = "rtl", ...props }, ref) {
    return (
      <TabsContext.Provider value={{ tone, size }}>
        <TabsPrimitive.Root
          {...props}
          ref={ref}
          dir={dir}
          className={cn("flex flex-col gap-16 font-sans", className)}
        />
      </TabsContext.Provider>
    );
  },
);

const TabsList = forwardRef<
  ComponentRef<typeof TabsPrimitive.List>,
  ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(function TabsList({ className, ...props }, ref) {
  return (
    <TabsPrimitive.List
      {...props}
      ref={ref}
      className={cn(
        "inline-flex w-full items-center justify-center gap-12 rounded-rounded border border-secondary-container bg-surface-background p-8 font-sans",
        className,
      )}
    />
  );
});

const TabsTrigger = forwardRef<
  ComponentRef<typeof TabsPrimitive.Trigger>,
  ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(function TabsTrigger({ className, ...props }, ref) {
  const { tone, size } = useContext(TabsContext);

  return (
    <TabsPrimitive.Trigger
      {...props}
      ref={ref}
      className={cn(tabsTriggerVariants({ tone, size }), className)}
    />
  );
});

const TabsContent = forwardRef<
  ComponentRef<typeof TabsPrimitive.Content>,
  ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(function TabsContent({ className, ...props }, ref) {
  return (
    <TabsPrimitive.Content
      {...props}
      ref={ref}
      className={cn(
        "text-body-14 text-surface-neutral-high-emphasis focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/30",
        className,
      )}
    />
  );
});

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsTriggerVariants };
export type { TabsProps };
