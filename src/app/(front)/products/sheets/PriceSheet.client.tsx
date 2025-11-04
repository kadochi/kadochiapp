"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import BottomSheet from "@/components/ui/BottomSheet/BottomSheet";
import SectionHeader from "@/components/layout/SectionHeader/SectionHeader";
import Input from "@/components/ui/Input/Input";
import Button from "@/components/ui/Button/Button";

/* ---- format helpers ---- */
function onlyDigits(v: string) {
  const persianToEn = v.replace(/[۰-۹]/g, (d) =>
    String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))
  );
  return persianToEn.replace(/[^\d]/g, "");
}
function withThousands(v: string) {
  if (!v) return "";
  v = v.replace(/^0+/, "");
  return v.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
function toInt(v: string) {
  const d = onlyDigits(v);
  return d ? Number(d) : 0;
}

export default function PriceSheet({
  isOpen,
  title = "بازه قیمت",
}: {
  isOpen: boolean;
  title?: string;
}) {
  const router = useRouter();
  const sp = useSearchParams();

  const initMin = useMemo(() => sp.get("min_price") || "", [sp]);
  const initMax = useMemo(() => sp.get("max_price") || "", [sp]);

  const [min, setMin] = useState<string>(withThousands(onlyDigits(initMin)));
  const [max, setMax] = useState<string>(withThousands(onlyDigits(initMax)));

  const close = () => {
    const usp = new URLSearchParams(sp.toString());
    usp.delete("sheet");
    router.replace(`/products?${usp.toString()}`, { scroll: false });
  };

  const apply = () => {
    const usp = new URLSearchParams(sp.toString());
    const nMin = toInt(min);
    const nMax = toInt(max);

    if (nMin > 0) usp.set("min_price", String(nMin));
    else usp.delete("min_price");

    if (nMax > 0) usp.set("max_price", String(nMax));
    else usp.delete("max_price");

    usp.set("page", "1");
    usp.delete("sheet");

    router.replace(`/products?${usp.toString()}`, { scroll: false });
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={close} ariaLabel={title}>
      <SectionHeader title={title} as="h3" />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "16px",
          padding: "0 var(--space-16) var(--space-40)",
          direction: "rtl",
        }}
      >
        <Input
          dir="ltr"
          label="از قیمت"
          placeholder="0"
          value={min}
          onChange={(e) =>
            setMin(withThousands(onlyDigits(e.currentTarget.value)))
          }
          showLabel
        />
        <Input
          dir="ltr"
          label="تا قیمت"
          placeholder="0"
          value={max}
          onChange={(e) =>
            setMax(withThousands(onlyDigits(e.currentTarget.value)))
          }
          showLabel
        />

        <div style={{ gridColumn: "1 / -1" }}>
          <Button
            onClick={apply}
            type="secondary"
            size="medium"
            aria-label="اعمال بازه قیمت"
            style={{ width: "100%" } as any}
          >
            اعمال
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
}
