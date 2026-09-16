# Bookmark Cinema Tickets

Bookmark is a cinema ticket pricing demo with a reusable pricing engine and a
React booking counter. The app lets a counter operator configure seat
inventory, select tickets, apply offers, review an itemised GST receipt, and
create a customer bill. The bill flow validates the customer details and opens
the device SMS composer with a ready-to-send ticket message.

## What it does

- Supports Silver, Gold, and Recliner seat tiers.
- Prevents booking sold-out or unavailable seats.
- Applies a flat festival discount and a capped member percentage discount.
- Charges a per-ticket convenience fee.
- Calculates GST using the configured slabs: 12% up to ₹100 per discounted
  ticket and 18% above ₹100, plus 18% GST on the convenience fee.
- Uses integer paisa internally so totals do not accumulate floating-point
  rounding errors.
- Shows every pricing adjustment in the receipt.
- Accepts customer name and a 10-digit mobile number before creating a bill.
- Opens an SMS handoff; it does not send messages automatically.

## Requirements

- Node.js 18 or newer
- npm

## Run the project

### Web app

```sh
cd cinema-app
npm install
npm run dev
```

Open the URL printed by Vite, normally <http://localhost:5173>.

### Pricing engine demo

From the repository root:

```sh
node demo.js
```

### Tests

```sh
node --test test/cinema-pricing-engine.test.js
```

### Quality checks

```sh
cd cinema-app
npm run lint
npm run build
```

## How to use the counter

1. Choose seats with the `+` controls.
2. Adjust inventory, offers, or the convenience fee if needed.
3. Review the live receipt and total.
4. Enter the customer's name and 10-digit mobile number.
5. Select **Create bill**.
6. Confirm the pre-filled message in the device's SMS app.

The SMS step is intentionally a client-side handoff using an `sms:` URL. A
production deployment would need a backend and an SMS provider such as Twilio
or MSG91 for automatic delivery, delivery status, retries, and audit logging.

## Repository layout

```text
.
├── cinema-pricing-engine.js       # CommonJS pricing engine and domain objects
├── demo.js                         # Runnable engine examples
├── test/
│   └── cinema-pricing-engine.test.js
├── cinema-app/
│   ├── src/App.jsx                 # Booking counter UI and bill flow
│   ├── src/App.css                 # Responsive visual design
│   ├── src/priceEngine.js          # Browser-compatible pricing implementation
│   └── package.json
├── reasoning.md                    # Architecture and pricing decisions
└── AI_logs.md                      # Concise implementation history
```

The root engine and browser engine intentionally share the same pricing
concepts, but they are separate modules because the root code is CommonJS and
the Vite app uses ES modules.

## Money and pricing model

All calculations are performed in paisa. For example, ₹150.50 is represented
internally as `15050`. The calculation order is:

1. Validate the requested seat tiers and quantities.
2. Calculate the ticket subtotal.
3. Apply enabled offers in order.
4. Distribute the total discount proportionally across ticket lines.
5. Calculate GST for each discounted ticket line.
6. Add the convenience fee and its GST.
7. Return the itemised grand total.

See [reasoning.md](./reasoning.md) for the design rationale and edge cases.

## Current limitations

- There is no persistent database or booking reservation service.
- Inventory edits are local to the current browser session.
- The SMS composer requires user confirmation and a compatible device/app.
- The browser and root pricing engines are maintained separately.
- No authentication, payment, showtime, movie catalogue, or seat-map system is
  included yet.
