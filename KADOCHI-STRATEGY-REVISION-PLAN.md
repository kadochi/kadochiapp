# Kadochi Strategy Revision: Demand-First, Zero-Injection Model

## Summary

Rewrite the existing English strategy document around an honest central conclusion:

- Kadochi currently has no validated demand from independent customers. Seven acquaintance orders and zero attributable orders from roughly 100,000 Instagram views do not establish product-market fit.
- Low flower prices have not generated demand, indicating that price and catalog breadth are not the primary problems.
- Kadochi should become a free occasion-management utility connected to a tightly controlled gifting-coordination service—not a broad gift marketplace.
- The strongest initial job is helping someone send a suitable gift into Tehran when they cannot be present, lack the recipient’s details, face a deadline, or must coordinate workplace gifting.
- Reaching 300 successfully delivered checkout orders per month will be a stretch target, not the base forecast. A credible month-12 base is 75–120 orders; 300 remains possible only if explicit month-3, month-6, and month-9 gates are passed.
- The default plan assumes no additional funding. The optional 100M toman becomes a staged contingency facility that may remain entirely unused.

The revised strategy will replace—not append to—the current document at `docs/KADOCHI-BUSINESS-MODEL-AND-STRATEGY.md`.

## Strategic and Business-Model Changes

### Positioning and personas

Position Kadochi as:

> A service that remembers important moments and reliably coordinates an appropriate gift when the sender cannot manage everything personally.

Prioritize behavioral situations rather than age or gender:

1. Remote or access-constrained sender delivering to a Tehran recipient.
2. Workplace organizer arranging a colleague’s birthday or appreciation gift.
3. Busy Tehran professional needing three credible options within a deadline and budget.
4. Relationship maintainer using reminders for several important people.
5. Recipient/wishlist user who may later become a sender.

Age and gender remain recommendation attributes, not personas.

Deprioritize bargain hunters, ordinary same-neighborhood flower/cake buyers, broad product-search customers better served by Digikala, and diaspora payments until legal and operational feasibility is confirmed.

The competitor model will include:

- Digikala and broad marketplaces: breadth, price comparison, and established trust.
- Florists, bakeries, delivery apps, and personal purchasing: proximity and low coordination cost.
- Specialized gift stores: delivery and gifting expertise.
- Kadochi: occasion memory, selection compression, recipient coordination, one accountable delivery, and repeat relationship data.

The document will explicitly note that few specialized competitors may indicate difficult economics—not automatically an attractive market gap.

### Two-layer business model

**Free utility layer**

- Personal and public occasion calendar.
- Reminder system and occasion planning.
- Catalog-only wishlists and share-controlled personal profiles.
- Rule-based gift finder.
- Recipient-assisted address and preference collection.
- Free workplace birthday calendar.
- Simple group-gift coordination with one organizer paying.

Because the user selected a Kadochi-only wishlist, it will be treated as a secondary acquisition mechanism until the reliable catalog is sufficiently broad. The year-one growth forecast will not depend on external-product wishlist virality.

**Transaction layer**

- Product and curated-bundle margin.
- Transparent delivery charges.
- Packaging and personalization upgrades.
- Prepaid workplace and B2B gifting.
- Later, paid organizational automation or service fees after repeated B2B demand.

No consumer subscription, free-shipping membership, supplier listing fee, marketplace onboarding, internal credit, or paid consumer freemium tier will be assumed in year one.

Global mechanisms to adapt:

- Moonpig’s occasion reminders and owned-data retention model. Its FY26 database reached 113M reminders, illustrating the importance of capturing intent before purchase. [Moonpig FY26 results](https://www.moonpig.group/media/moonpig-group-plc-fy26-results-announcement.html)
- Goody’s recipient-choice, gift-link, scheduling, and workplace-gifting mechanics. [Goody pricing and features](https://www.ongoody.com/business/pricing)
- Elfster’s free sharing and wishlist invitation loops, restricted here to Kadochi’s catalog. [Elfster model](https://www.elfster.com/how-elfster-works/)
- 1-800-Flowers as a warning against inventory, marketing intensity, acquisitions, and premature paid membership. [2025 annual report](https://www.1800flowersinc.com/~/media/Files/O/One-800-Flowers-V4/documents/annual-reports/flws-2025-annual-report.pdf)

### Offer, supply, and fulfillment

Replace category-led merchandising with four situation-led collections:

- Send a birthday gift to someone in Tehran.
- Send a complete gift to a workplace.
- I need something dependable today or tomorrow.
- Plan a personalized gift in advance.

Each collection receives entry, core, and premium choices, producing approximately 9–15 visible offers from 6–8 operational recipes.

Pricing will use weekly relative bands rather than long-lived toman thresholds:

- Entry: 0.55–0.75 × the current Kadochi Gift Index.
- Core: 0.90–1.15 × the index.
- Premium: 1.40–2.00 × the index.

Until independent sales data exists, the index is the median price of comparable available Tehran offers. Every order must preserve at least 20% variable contribution.

Fulfillment rules:

- Customer payment or supplier credit funds procurement.
- One external supplier per launch offer whenever possible.
- No finished-goods inventory during the first 90 days.
- Existing boxes, ribbons, stickers, and office assets are used before any packaging purchase.
- No custom packaging.
- Delivery cost and realistic delivery date appear before login.
- Same-day promises require confirmed availability and capacity.
- At 300 monthly orders, suppliers must accept payment after customer funds settle or provide short settlement terms; otherwise the current cash balance cannot support approximately ten daily orders.

### Website and product backlog

The live site is visually polished and responsive; the priority is proposition and funnel coherence, not an aesthetic rebuild.

The revised document will include these observed issues:

- The homepage remains category-first and flower-heavy rather than communicating the access/coordination problem.
- The 161-product listing begins almost entirely with flowers.
- A plausible finder path—young woman, birthday, home décor—returned zero products.
- The calendar currently stores only title/date/recurrence and provides a generic route to the catalog.
- Adding an occasion and reaching checkout require OTP authentication before the user sees the complete value.
- The reviewed product had no customer reviews and weak first-fold delivery, substitution, packaging, and service-recovery evidence.
- Footer social links point to generic platform URLs.
- The repository does not show a complete explicit commercial funnel-event model.

Prioritized backlog:

1. Instrument attribution and the complete funnel.
2. Build persona-specific landing pages instead of sending Instagram traffic to the generic homepage.
3. Prevent gift-finder zero-result dead ends; add budget, relationship, urgency, delivery area, interests, and readiness while making category optional.
4. Let users try an occasion draft before authentication; request phone verification when saving reminders.
5. Extend occasions with recipient, relationship, city, budget range, preference notes, reminder timing, consent, and gift history.
6. Turn reminders into a three-option planning page rather than a generic product link.
7. Pilot “send without knowing the address”: the sender prepays for an equal-price shortlist, the recipient privately selects an option and provides address/time, and procurement begins only after acceptance.
8. Add a free workplace calendar for small teams, converted through standardized prepaid gifts.
9. Add private claiming and availability warnings to catalog-only wishlists.
10. Defer AI until the rule-based finder has at least 1,000 completed sessions, 100 independent orders, and a measured problem AI could improve.

Proposed future analytics events include landing view, occasion saved, reminder consent/sent/clicked, finder start/completion/zero result, product view, add-to-cart, checkout start, payment, delivery, wishlist share/view, recipient-link completion, and attributed order source.

No software implementation or API change is part of the strategy-document revision.

## One-Year Growth, Capital, and Viability Plan

### Target framework

An order is one independently initiated, paid, successfully delivered checkout/order ID. One corporate invoice counts as one order; its recipient delivery units are reported separately.

Month-12 scenarios:

- Downside/maintenance: 20–40 monthly orders.
- Credible base: 75–120 monthly orders.
- Stretch target: 300 monthly orders.

Stretch milestones:

- Month 3: 20 monthly orders.
- Month 6: 75 monthly orders.
- Month 9: 150 monthly orders.
- Month 12: 300 monthly orders.

At 300 orders:

| AOV scenario | Monthly GMV | Contribution at 20% |
|---:|---:|---:|
| 1.5M toman | 450M | 90M |
| 2M toman | 600M | 120M |
| 3M toman | 900M | 180M |

The current 3M AOV remains unvalidated because all seven orders came from acquaintances.

A hypothetical month-12 acquisition mix will be used to expose the required scale:

- 180 first-time orders from approximately 12,000 qualified sessions at 1.5% conversion.
- 90 repeat, reminder, and referral orders.
- 30 independently paid workplace-organizer orders.

These are required funnel conditions, not forecasts.

### Dual-track dashboard

**Community and awareness**

- Qualified website sessions rather than social views.
- Verified owned contacts.
- Activated utility users.
- Users with at least two saved recurring occasions and reminder consent.
- Active occasion records and reminders due.
- Reminder click and order conversion.
- Gift-finder starts, completions, zero results, and result clicks.
- Wishlist/profile shares and unique viewers.
- Recipient-link completion.
- Workplace calendars created.
- D30 and D90 utility retention.
- Share/referral contribution to new activated users.

**Commerce**

- Non-network orders and their percentage of total orders.
- Successfully delivered checkout orders.
- B2B recipient units reported separately.
- Website conversion, AOV, and inflation-adjusted GMV.
- Product gross margin and variable contribution.
- CAC by source and cohort.
- Repeat/reminder/referral order share.
- On-time/in-full delivery, cancellations, substitutions, refunds, and damage.
- Supplier score and payment terms.
- Cash runway and fully loaded economics including imputed founder labor.

Instagram will be diagnosed as view → profile visit → website click → qualified session → activation → cart → checkout → payment. Views alone will not be a target.

### Zero-injection capital model

Before discretionary spending:

> Unrestricted cash = bank cash − paid-undelivered customer liabilities − committed supplier/refund liabilities

> Protected floor = the highest of 12M toman, three months of unavoidable cash burn, or twice the median external cash cost of an order

No growth spending occurs until the actual office, utility, software, SMS, tax, and other recurring burn is reconciled from bank records.

Current operating rules:

- Customer receipts remain restricted until delivery and immediate recovery exposure are covered.
- Existing packaging is used before replacement.
- No paid acquisition during the first 30 days.
- No inventory, custom boxes, agency, new lease, or salary during the first 90 days.
- Founder time is tracked at an imputed market cost even though founders initially take no cash salary.

Optional 100M contingency facility:

- 10M after ten independent positive-contribution orders and complete attribution.
- 20M after reaching 30 monthly orders with one repeatable positive-CAC channel.
- 30M after 75 monthly orders, at least 20% contribution, 95% OTIF, and sufficient supplier terms.
- 40M after 150 monthly orders, fully loaded contribution viability, and a successful peak-capacity test.

Each tranche must be independently approved and may remain unused. Future tranches are never included in runway or commitments.

### Team structure

Assign one primary accountable owner to each area:

- Product/growth: funnel instrumentation, website, calendar/finder, and content conversion.
- Commercial/finance: strategy, cash, unit economics, suppliers, and workplace/B2B sales.
- Operations/customer experience: procurement, packaging, delivery, support, and recovery.

Run no more than two meaningful growth/product experiments simultaneously. Development capacity is treated as scarce founder time, not free capacity.

## Validation and Acceptance Criteria

### First 90 days

- Days 1–7: reconcile cash and burn, reconstruct all seven orders, instrument the funnel, interview the seven buyers, and identify acquaintance bias.
- Days 8–30: interview 20–30 target non-buyers; launch remote-sender, workplace, urgent, and budget-guidance landing tests; obtain at least three independent paid orders.
- Days 31–60: reach at least ten cumulative independent positive-contribution orders and complete one prepaid workplace pilot.
- Days 61–90: target 25–30 cumulative independent deliveries, one repeatable acquisition path, at least 20% contribution, and 95% OTIF.

Decision rules:

- Fewer than ten independent orders by day 90: stop broad B2C expansion; focus on prepaid workplace concierge or pause further investment.
- Ten to twenty-four: keep only the strongest situation/persona and continue without growth capital.
- At least twenty-five with margin, attribution, and reliability: proceed to controlled scaling.
- Fewer than 30 monthly orders by month 6: formally retire the 300 target.
- 30–74 by month 6: adopt 75–120 as the year-end target.
- At least 75 by month 6 and 150 by month 9: retain 300 as a credible stretch.
- If independent demand requires discounts, free delivery, or negative contribution, reconsider the commerce thesis regardless of order count.

Stress tests will cover 1.5M/2M/3M AOV, 15% supplier inflation, 25% courier inflation, delayed gateway settlement, three clustered refunds, zero additional funding, internet/SMS interruption, supplier failure, and occasion demand spikes.

The finished document must clearly distinguish current features from proposed capabilities, include the live-site audit, cite current primary market sources, explain why the business may fail, and avoid presenting 300 orders as guaranteed or forecasted success.

## Assumptions

- Tehran remains the year-one delivery destination; senders may live elsewhere.
- The 300 target means successful checkout orders, not individual B2B gift units.
- Founders take no cash salaries during the initial 90-day validation period.
- Wishlists remain restricted to Kadochi products.
- Birthdays are the always-on demand engine; Yalda, Valentine’s Day, Nowruz, Mother’s Day, Father’s Day, and Daughter’s Day are seasonal acquisition events with annually verified dates and preorder limits.
- Iran’s current economic assumptions will be refreshed using the [IMF](https://www.imf.org/en/countries/irn), [World Bank](https://documents1.worldbank.org/curated/en/099635304152611739/pdf/IDU-5b2c845c-675f-43d2-8411-9d2c38f7624b.pdf), national e-commerce reporting, and connectivity evidence at the time of revision.
