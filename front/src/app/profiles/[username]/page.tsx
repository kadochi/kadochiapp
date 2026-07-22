import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { randomUUID } from "crypto";

import PublicPersonalProfilePage from "@/features/profile/components/public-personal-profile-page";
import { getPublicPersonalProfile } from "@/features/profile/services/profile.server";
import { listProducts } from "@/features/products/services/products.server";
import type { ServiceError } from "@/lib/http/errors";
import type { UpstreamError } from "@/lib/http/upstream";

type Params = { username: string };

const loadProfile = cache(async (username: string) => {
  try {
    return await getPublicPersonalProfile(username, randomUUID());
  } catch (error) {
    const detail = (error as ServiceError | UpstreamError)?.detail;
    if (detail?.code === "not_found") return null;
    throw error;
  }
});

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { username } = await params;
  const profile = await loadProfile(username);
  if (!profile) return { title: "پروفایل پیدا نشد | کادوچی" };
  return {
    title: `${profile.displayName} | کادوچی`,
    description: `لیست آرزوهای ${profile.displayName} در کادوچی`,
    alternates: { canonical: `/profiles/${profile.username}` },
  };
}

export default async function Page({ params }: { params: Promise<Params> }) {
  const { username } = await params;
  const profile = await loadProfile(username);
  if (!profile) notFound();

  const products = profile.showWishlist && profile.productIds.length
    ? (await listProducts({ include: profile.productIds, perPage: profile.productIds.length })).items
    : [];

  return <PublicPersonalProfilePage products={products} profile={profile} />;
}
