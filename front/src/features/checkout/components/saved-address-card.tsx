"use client";

import { Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { RadioGroupItem } from "@/components/ui/radio";
import type { SavedAddress } from "../types";

const cardClassName = "rounded-m border border-border-high-emphasis bg-surface-background has-[[data-state=checked]]:border-2 has-[[data-state=checked]]:border-secondary has-[[data-state=checked]]:shadow-[0_0_0_4px_var(--color-secondary-container)]";

function AddressDetails({ address }: { address: SavedAddress }) {
  return <span className="grid gap-4"><span className="text-title-14 font-bold">{address.title}</span><span className="text-label-12 leading-20 text-surface-neutral-mid-emphasis">{["تهران", address.address1, address.buildingNumber ? `پلاک ${address.buildingNumber}` : "", address.unitNumber ? `واحد ${address.unitNumber}` : "", address.address2].filter(Boolean).join("، ")}</span></span>;
}

function AddressActions({ address, busy, onEdit, onDelete }: Pick<SavedAddressCardProps, "address" | "busy" | "onEdit" | "onDelete">) {
  return <div className="flex gap-8 border-t border-border-mid-emphasis px-12 py-8">
    <Button aria-label={`ویرایش ${address.title}`} disabled={busy} size="small" variant="link-ghost" onClick={() => onEdit(address)}><Pencil aria-hidden /> ویرایش</Button>
    <Button aria-label={`حذف ${address.title}`} className="text-error" disabled={busy} size="small" variant="link-ghost" onClick={() => onDelete(address)}><Trash2 aria-hidden /> حذف</Button>
  </div>;
}

type SavedAddressCardProps = {
  address: SavedAddress;
  busy?: boolean;
  onDelete: (address: SavedAddress) => void;
  onEdit: (address: SavedAddress) => void;
  selectable?: boolean;
};

export function SavedAddressCard({ address, busy = false, onDelete, onEdit, selectable = false }: SavedAddressCardProps) {
  if (selectable) {
    return <div className={cardClassName}>
      <RadioGroupItem
        className="w-full p-16"
        disabled={busy}
        label={<AddressDetails address={address} />}
        value={address.id}
      />
      <AddressActions address={address} busy={busy} onDelete={onDelete} onEdit={onEdit} />
    </div>;
  }

  return <article className={cardClassName} aria-label={address.title}>
    <div className="p-16"><AddressDetails address={address} /></div>
    <AddressActions address={address} busy={busy} onDelete={onDelete} onEdit={onEdit} />
  </article>;
}
