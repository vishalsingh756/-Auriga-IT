# Architecture and pricing reasoning

## Product boundary

This project is a counter-side pricing and bill-generation demo, not a
complete cinema operations platform. The UI focuses on making the price
calculation visible and editable while keeping the core rules reusable in
Node.js tests and in the browser.

## Two compatible engines

The repository contains:

- `cinema-pricing-engine.js`, a CommonJS module used by `demo.js` and the Node
  tests.
- `cinema-app/src/priceEngine.js`, an ES module used by the Vite application.

They have parallel behavior because the browser bundle should not import the
CommonJS module directly. This is a deliberate compatibility trade-off. If
the project grows, the next refactor should move shared rules into one
package that can be consumed by both environments.

## Money representation

Prices are converted to integer paisa at the boundary and remain integers
throughout the calculation. This avoids errors such as `0.1 + 0.2` and makes
discount allocation and GST reproducible.

## Calculation order

1. Resolve each requested seat tier.
2. Validate positive quantities and available inventory.
3. Calculate the ticket subtotal.
4. Apply offers sequentially to the running subtotal.
5. Allocate the aggregate discount proportionally across ticket lines.
6. Select GST from the discounted per-ticket price.
7. Add the convenience fee for every ticket.
8. Add GST on the convenience fee.

Applying offers sequentially means the second offer operates on the amount
remaining after the first offer. The receipt keeps each discount as a separate
line so the result can be audited.

## Discount rules

- **Flat offer:** applies only when the original ticket subtotal reaches the
  minimum spend; it cannot reduce the running amount below zero.
- **Percentage offer:** applies to the running amount and is limited by its
  configured cap.
- **Mixed tiers:** discounts are distributed pro rata by line subtotal, with
  leftover paisa allocated by largest fractional remainder.

## GST rules

The default ticket slabs are:

- 12% when a discounted ticket is priced at or below ₹100.
- 18% when it is above ₹100.

The convenience fee uses a separate 18% rate. Keeping ticket GST and fee GST
separate makes the receipt and future tax changes clearer.

## UI and bill flow

The React UI derives the receipt from current selections and configuration;
there is no duplicated total stored in component state. The bill form requires
a non-empty name, a 10-digit mobile number, and at least one selected seat.
After validation it creates a compact message and opens the platform SMS
composer. This is a handoff, not automatic delivery, and avoids pretending
that a browser can send SMS without a provider.

## Error handling

The root engine uses `PricingError` for invalid tiers, quantities, and
availability. The browser engine filters invalid selections for a forgiving
counter experience and returns no receipt when no valid seat remains. The UI
reports bill-form errors inline rather than silently failing.

## Future refactoring

For production use, separate the pricing library into a shared package,
persist inventory and bills behind an API, reserve seats atomically, add
authentication, and integrate a provider-backed SMS service with delivery
status and retries.
