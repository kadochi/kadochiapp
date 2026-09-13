import { GiftFinderRoute } from "@/features/gift-finder/components/gift-finder-route";

export const revalidate = 300;

export default function GiftFinderModalPage() {
  return <GiftFinderRoute dismissMode="back" />;
}
