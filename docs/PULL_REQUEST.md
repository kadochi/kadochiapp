### Overview

This PR documents current production issues and proposes short-term mitigations alongside next-step actions. It targets parity between local and Vercel behavior, payment flow reliability, catalog filter performance/UX, and data freshness in profile screens.

### Known Issues

- **Comments work locally but fail on Vercel**
  - Local development accepts and persists comments; production (Vercel) rejects or no-ops.
- **Payment success page not shown**
  - After successful payment, users are redirected away instead of landing on the success page.
- **Filters are slow**
  - Applying filters causes a noticeable delay before results render.
- **Checkout: intermittent generic error on payment**
  - Pressing the payment button sometimes returns an unhelpful generic error message.
- **Profile → My Orders: latest order not visible until refresh**
  - Newly placed orders do not appear immediately; manual page refresh is required.
