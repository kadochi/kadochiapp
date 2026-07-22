"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";

import { Header } from "@/components/layout/header";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toaster";
import { useAuth } from "@/features/auth/auth-provider";
import { AddressEditorSheet } from "@/features/checkout/components/address-editor-sheet";
import { SavedAddressCard } from "@/features/checkout/components/saved-address-card";
import { createSavedAddress, deleteSavedAddress, listSavedAddresses, updateSavedAddress } from "@/features/checkout/services/checkout";
import type { SavedAddress } from "@/features/checkout/types";

export function ProfileAddressesPage() {
  const router = useRouter();
  const { status } = useAuth();
  const { toast } = useToast();
  const [addresses, setAddresses] = useState<SavedAddress[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<SavedAddress | null>(null);
  const [removingAddressId, setRemovingAddressId] = useState<string | null>(null);

  useEffect(() => {
    if (status === "anonymous") router.replace("/login?next=/profile/addresses");
  }, [router, status]);

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    void listSavedAddresses()
      .then((result) => {
        if (!cancelled) {
          setAddresses(result.items);
          setLoadError(null);
        }
      })
      .catch((error) => {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : "دریافت آدرس‌ها انجام نشد.");
      });
    return () => { cancelled = true; };
  }, [status]);

  const openNewAddress = () => {
    setEditingAddress(null);
    setSheetOpen(true);
  };

  const deleteAddress = async (address: SavedAddress) => {
    if (removingAddressId) return;
    setRemovingAddressId(address.id);
    try {
      await deleteSavedAddress(address.id);
      setAddresses((current) => current?.filter((item) => item.id !== address.id) ?? current);
      toast({ tone: "success", title: "آدرس حذف شد" });
    } catch (error) {
      toast({ tone: "error", title: "حذف آدرس انجام نشد", description: error instanceof Error ? error.message : undefined });
    } finally {
      setRemovingAddressId(null);
    }
  };

  return <div className="min-h-dvh bg-surface-background" dir="rtl">
    <Header backUrl="/profile" title="آدرس‌ها" variant="internal" />
    <main className="mx-auto grid w-full max-w-[600px] gap-16 px-16 py-16 pb-[calc(var(--spacing-32)+env(safe-area-inset-bottom))]">
      <div className="flex items-center justify-between gap-16">
        <div>
          <h1 className="m-0 text-title-18 font-bold">آدرس‌های من</h1>
          <p className="mb-0 mt-4 text-label-14 text-surface-neutral-mid-emphasis">نشانی‌های دریافت سفارش را مدیریت کنید.</p>
        </div>
        <Button size="small" variant="tertiary-outline" onClick={openNewAddress}><Plus aria-hidden /> افزودن</Button>
      </div>

      {status === "error" || loadError ? <Alert tone="error">{loadError ?? "دریافت آدرس‌ها با مشکل مواجه شد. دوباره تلاش کنید."}</Alert> : null}
      {status === "loading" || addresses === null ? <div className="grid gap-16"><div className="h-132 animate-pulse rounded-m bg-surface" /><div className="h-132 animate-pulse rounded-m bg-surface" /></div> : null}
      {addresses?.length === 0 ? <div className="rounded-m border border-dashed border-border-high-emphasis px-16 py-24 text-center text-label-14 text-surface-neutral-mid-emphasis">هنوز نشانی‌ای ثبت نکرده‌اید. اولین آدرس دریافت سفارش را اضافه کنید.</div> : null}
      {addresses?.map((address) => <SavedAddressCard key={address.id} address={address} busy={removingAddressId === address.id} onDelete={deleteAddress} onEdit={(item) => { setEditingAddress(item); setSheetOpen(true); }} />)}
    </main>

    <AddressEditorSheet
      address={editingAddress}
      open={sheetOpen}
      onOpenChange={(open) => { setSheetOpen(open); if (!open) setEditingAddress(null); }}
      onSave={async (input) => {
        if (editingAddress) {
          const saved = await updateSavedAddress(editingAddress.id, input);
          setAddresses((current) => current?.map((item) => item.id === saved.id ? saved : item) ?? current);
        } else {
          const saved = await createSavedAddress(input);
          setAddresses((current) => [saved, ...(current ?? [])]);
        }
      }}
    />
  </div>;
}
