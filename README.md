# Cinema Pricing Engine

Reusable CommonJS pricing engine for cinema bookings. It validates seat availability,
applies stacked discounts, calculates per-ticket fees and GST, and produces a
paisa-exact itemised receipt.

```sh
node demo.js
node --test test/cinema-pricing-engine.test.js
```