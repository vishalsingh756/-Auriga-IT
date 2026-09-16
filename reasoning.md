# Reasoning

This document contains reasoning and decision-making processes for the cinema pricing engine project.

## Key Design Decisions

### 1. Paisa-Based Internal Representation
**Decision:** All monetary values are stored internally as integer paisa (1 paisa = 0.01 rupees) instead of decimal rupees.
**Rationale:** 
- Avoids floating-point precision errors that could cause money calculation discrepancies
- Ensures cent-accurate billing (important for financial transactions)
- Allows for strict integer arithmetic without rounding errors during intermediate calculations

### 2. Seat Tier Class Architecture
**Decision:** Created separate `SeatTier` class to encapsulate tier properties and `Show` class to manage collections of tiers.
**Rationale:**
- Separates concerns: tier pricing/availability logic vs. show management
- Makes it easy to query tier availability (`available`, `isSoldOut` getters)
- Allows shows to have multiple tiers with different prices (premium, standard, economy)
- Uses Map for O(1) tier lookups by name

### 3. Discount Abstraction
**Decision:** Implemented discount objects with `kind`, `amountPaisa`/`percent`, and optional constraints (`minSubtotalPaisa`, `capPaisa`).
**Rationale:**
- Supports both flat discounts (e.g., "₹50 off") and percentage discounts (e.g., "10% off")
- Allows stacking multiple discounts with minimum subtotal thresholds
- Cap on percentage discounts prevents excessive discounting on large orders
- Flexible labeling for receipt display

### 4. Custom Error Handling
**Decision:** Created `PricingError` class extending Error for domain-specific exceptions.
**Rationale:**
- Distinguishes pricing logic errors from other runtime errors
- Makes error handling more explicit and testable
- Improves debugging by clearly identifying invalid seat tiers or invalid operations

## Implementation Notes

### GST Slab Calculation
- India uses **tiered GST rates** based on price: 12% for items ≤₹100, 18% for higher-priced items
- Implemented `gstRateForUnitPrice()` to dynamically determine the correct GST rate
- GST is calculated per-tier line based on the discounted unit price
- This reflects realistic Indian cinema billing practices

### Discount Application Strategy
- Discounts are applied **in order** with a "running total" approach
- Each discount operates on the remaining balance, not the original subtotal
- This allows for **stacked discounts** with constraints (e.g., "only apply if cart > ₹500")
- `minSubtotalPaisa` threshold ensures discounts only apply when cart is large enough
- `capPaisa` on percentage discounts prevents excessive discounting

### Pro-Rata Distribution
- When applying discounts, they're distributed **proportionally** across ticket tiers
- This ensures fair discount distribution when buying mixed-tier seats
- Avoids anomalies like discounting premium seats more than economy seats

### Convenience Fee Handling
- Charged **per-ticket**, not per-order (realistic for booking platforms)
- Has its own **separate GST calculation** at a fixed rate (typically 18% in India)
- Kept separate from ticket GST calculations for clear itemization

### Receipt Itemization
- The final receipt includes:
  - Line items for each seat tier (quantity × unit price)
  - Applied discounts with labels
  - Ticket GST (per-tier)
  - Convenience fee with its own GST
  - Grand total
- This granular breakdown is useful for dispute resolution and tax reporting
