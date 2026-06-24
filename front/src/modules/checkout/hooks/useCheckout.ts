import { useMutation } from "@tanstack/react-query";
import type { CheckoutStartPayload, CheckoutStartResponse } from "../types";
import { submitCheckout } from "@/modules/checkout/services/checkout";

export function useCheckoutMutation() {
  return useMutation({
    mutationFn: (payload: CheckoutStartPayload): Promise<CheckoutStartResponse> =>
      submitCheckout(payload),
  });
}
