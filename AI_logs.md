# AI implementation log

**Project:** Bookmark Cinema Tickets
**Last updated:** 2026-09-16

This is a concise record of implementation decisions and validation results.
It is not a transcript and does not contain credentials or customer data.

## 1. Pricing engine

**Goal:** Build reusable cinema pricing rules for seat tiers, availability,
offers, convenience fees, GST, and exact totals.

**Implemented:**

- `SeatTier` and `Show` domain objects.
- `PricingError` for invalid booking requests.
- Integer-paisa money handling.
- Flat and capped percentage discounts.
- Proportional discount allocation across mixed ticket lines.
- GST slabs and itemised receipt output.
- Import handling for messy seat price lists.

**Validation:** Node test coverage exercises parsing, duplicate rows,
discounts, GST boundaries, sold-out tiers, and insufficient inventory.

## 2. Browser booking counter

**Goal:** Make the pricing engine usable at a cinema counter.

**Implemented:**

- React/Vite booking interface.
- Editable tier price and inventory settings.
- Seat steppers with availability limits.
- Toggleable festival and member offers.
- Live receipt with subtotal, discounts, fee, GST, and grand total.
- Responsive dark cinema visual design.

**Validation:** `npm run build` and `npm run lint` pass.

## 3. Customer bill and ticket handoff

**Goal:** Collect a customer name and phone number, then create a usable
ticket message.

**Implemented:**

- Customer name field.
- 10-digit mobile validation.
- Bill creation button and inline success/error states.
- Message containing customer name, selected tickets, and final total.
- `sms:` URL handoff to the device's SMS composer.

**Boundary:** The browser does not send SMS automatically. Automatic delivery
requires a backend, provider credentials, delivery tracking, and privacy
controls.

## 4. Documentation pass

**Goal:** Replace template and stale notes with project-specific guidance.

**Implemented:**

- Root README with setup, commands, behavior, structure, and limitations.
- App README with source map and frontend commands.
- Reasoning document covering architecture and calculation order.
- This implementation log with outcomes and validation.

## Known follow-up work

- Consolidate the root and browser pricing logic into a shared package.
- Add persistent shows, inventory reservations, and bill records.
- Add a provider-backed SMS endpoint.
- Add end-to-end browser tests for bill validation and SMS handoff.
