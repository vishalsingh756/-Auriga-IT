# Cinema Pricing Engine

A cinema booking project with a reusable CommonJS pricing engine and a React/Vite
booking interface. It supports seat tiers, availability checks, stacked offers,
per-ticket convenience fees, GST, messy price-list imports, and itemised receipts.
All money is calculated in integer paisa to avoid floating-point errors.

## Run the engine

```sh
node demo.js
node --test test/cinema-pricing-engine.test.js
```

## Run the web app

```sh
cd cinema-app
npm install
npm run dev
```

The core API is in `cinema-pricing-engine.js`. `importSeatTiers(rows)` accepts
`{ name, price }` objects or `[name, price]` rows, parses rupee/INR values, keeps
the first case-insensitive duplicate, and reports imported, deduplicated, and
rejected rows.

## Project layout

- `cinema-pricing-engine.js`: pricing rules and receipt generation
- `cinema-app/`: interactive React booking UI
- `test/`: Node test coverage for pricing behavior
- `demo.js`: runnable booking examples
- `reasoning.md`: key implementation decisions
- `AI_logs.md`: brief record of prompts and project milestones