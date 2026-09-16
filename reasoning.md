# Reasoning

## Core decisions

- **Integer paisa:** all internal amounts use integer paisa, preventing rounding
  drift in discounts, GST, and totals.
- **Separate domain objects:** `SeatTier` owns price and availability while
  `Show` owns tier lookup and booking validation.
- **Composable discounts:** flat and percentage offers share one model with
  minimum-subtotal and percentage-cap constraints.
- **Explicit failures:** `PricingError` makes invalid tiers, quantities, and
  unavailable seats distinguishable from programming errors.

## Calculation order

1. Validate each requested tier and quantity against show availability.
2. Calculate the ticket subtotal.
3. Apply eligible discounts in the supplied order to the running subtotal.
4. Distribute the discount across ticket lines so mixed tiers remain itemised.
5. Calculate ticket GST by the discounted per-ticket price: 12% up to ₹100 and
   18% above ₹100.
6. Add the per-ticket convenience fee and its separate 18% GST.

This order keeps the receipt auditable: every adjustment is visible and the
grand total is derived from integer arithmetic.
