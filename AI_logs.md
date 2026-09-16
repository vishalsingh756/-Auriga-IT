# AI Logs

**Project:** Cinema Pricing Engine  
**Date:** 2026-09-16  
**Repository:** -Auriga-IT

---

## All Prompts Used

### Prompt 1: Build Cinema Pricing Engine
**Request:**
```
ROUND 2  ·  BUILD ROUND

Friday night at the multiplex

The multiplex booking counter keeps mis-pricing tickets and the queue is getting angry. Seats come in tiers — Silver, Gold, Recliner — at different prices, and by showtime some tiers sell out and shouldn't be bookable. There are offers on: a flat festival discount and a percentage off for members (capped). Every booking then adds a small per-ticket convenience fee and GST on top, and it all has to total to the exact paisa. Customers keep demanding a clear line-by-line breakup of the bill.

Build a pricing engine the counter can trust.

(The messy real-world money rules are the point — handle each correctly, and build it for any cinema counter, not one show. Get a plain booking total right first, then layer on the offers, the fee and the tax.)
```

**Outcome:** Created:
- `cinema-pricing-engine.js` — Core engine with SeatTier, Show, offer functions, and priceBooking logic
- `demo.js` — Five booking scenarios (normal, sold-out, insufficient seats, odd percentages, GST slab boundary)
- `test/cinema-pricing-engine.test.js` — Focused unit tests
- Updated `README.md` with usage instructions

---

### Prompt 2: Commit All Changes
**Request:** `commit all this`

**Outcome:** Created git commit `6616706` with message "Add cinema pricing engine with demo and tests"

---

### Prompt 3: Run Terminal Validation
**Request:** `can run this in terminal`

**Outcome:** Executed tests and demo in terminal; verified all scenarios pass with correct receipts and totals

---

### Prompt 4: Create Web Interface
**Request:** `can we create a webpage for it so can see web`

**Status:** In progress — building HTML/CSS/JS interface for interactive bookings

---

### Prompt 5: Document All Prompts
**Request:** `i want you all the prompt that i used for this project to be written in ailogs.md delete all stuff from ailogs`

**Outcome:** This log created with all project prompts and outcomes
