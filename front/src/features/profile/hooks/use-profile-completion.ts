"use client";

import { useEffect, useMemo, useState } from "react";

import { listSavedAddresses } from "@/features/checkout/services/checkout";
import type { Customer } from "@/features/auth/types";
import { getPersonalProfile, listProfileProducts } from "../services/profile";
import { getProfileCompletion, type RegularUserMissionState } from "../utils/profile-completion";

export function useProfileCompletion(customer: Customer | null) {
  const [loadedRegularMissions, setLoadedRegularMissions] = useState<{ key: string; value: RegularUserMissionState } | null>(null);
  const profileDetailsComplete = customer ? getProfileCompletion(customer).level !== "newcomer" : false;
  const missionKey = customer && profileDetailsComplete ? `${customer.id}:regular` : null;
  const regularMissions = missionKey && loadedRegularMissions?.key === missionKey ? loadedRegularMissions.value : null;

  useEffect(() => {
    if (!customer || !missionKey) return;

    let cancelled = false;
    void Promise.allSettled([
      listSavedAddresses(),
      listProfileProducts("like", 1, 1),
      listProfileProducts("save", 1, 1),
      getPersonalProfile(),
    ]).then(([addresses, favorites, wishlist, personalProfile]) => {
      if (cancelled) return;
      setLoadedRegularMissions({
        key: missionKey,
        value: {
          hasAddress: addresses.status === "fulfilled" && addresses.value.items.length > 0,
          hasFavorite: favorites.status === "fulfilled" && favorites.value.total > 0,
          hasWishlist: wishlist.status === "fulfilled" && wishlist.value.total > 0,
          hasPersonalProfile: personalProfile.status === "fulfilled" && personalProfile.value.enabled && Boolean(personalProfile.value.username),
        },
      });
    });

    return () => { cancelled = true; };
  }, [customer, missionKey]);

  return useMemo(() => ({
    // The second-level checks are asynchronous. Keeping the completion unset
    // until they resolve prevents a Pro user from briefly rendering as Regular.
    completion: customer && !(profileDetailsComplete && regularMissions === null)
      ? getProfileCompletion(customer, regularMissions ?? undefined)
      : null,
    loading: profileDetailsComplete && regularMissions === null,
  }), [customer, profileDetailsComplete, regularMissions]);
}
