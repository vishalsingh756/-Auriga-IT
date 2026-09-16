'use strict';

const assert = require('node:assert/strict');
const {
  SeatTier, Show, PricingError, flatDiscount, percentDiscount, priceBooking, toPaisa,
  importSeatTiers,
} = require('../cinema-pricing-engine');

const importedPriceList = importSeatTiers([
  { name: ' Gold ', price: '₹2,50.00' },
  { name: 'gold', price: '999' },
  { name: 'Silver', price: '1,50.5' },
  { name: 'Recliner', price: '' },
  { name: 'Balcony', price: '-100' },
  { name: '', price: '200' },
  ['Box', 'INR 1,200'],
]);

assert.deepEqual(importedPriceList.summary, { imported: 3, deduplicated: 1, rejected: 3 });
assert.deepEqual(importedPriceList.tiers.map((tier) => [tier.name, tier.pricePaisa]), [
  ['Gold', 25000],
  ['Silver', 15050],
  ['Box', 120000],
]);
assert.equal(importedPriceList.deduplicated[0].name, 'gold');
assert.deepEqual(importedPriceList.rejected.map((entry) => entry.reason), [
  'Price must be a non-negative rupee amount',
  'Price must be a non-negative rupee amount',
  'Seat class name is blank',
]);

const show = new Show([
  new SeatTier('Silver', toPaisa(150), 100, 40),
  new SeatTier('Gold', toPaisa(250), 80, 79),
  new SeatTier('Recliner', toPaisa(450), 20, 20),
]);

const result = priceBooking(show, [
  { tierName: 'Silver', quantity: 3 },
  { tierName: 'Gold', quantity: 1 },
], {
  offers: [
    flatDiscount({ amountPaisa: toPaisa(50), minSubtotalPaisa: toPaisa(300) }),
    percentDiscount({ percent: 10, capPaisa: toPaisa(100) }),
  ],
  convenienceFeePaisa: toPaisa(30),
});

assert.equal(result.subtotalPaisa, toPaisa(700));
assert.equal(result.totalDiscountPaisa, toPaisa(115));
assert.equal(result.discountedSubtotalPaisa, toPaisa(585));
assert.equal(result.grandTotalPaisa, 83190);
assert.equal(result.lines.reduce((sum, line) => sum + line.discountPaisa, 0), result.totalDiscountPaisa);

assert.throws(
  () => priceBooking(show, [{ tierName: 'Recliner', quantity: 1 }]),
  (error) => error instanceof PricingError && /sold out/.test(error.message),
);
assert.throws(
  () => priceBooking(show, [{ tierName: 'Gold', quantity: 2 }]),
  (error) => error instanceof PricingError && /Only 1 Gold/.test(error.message),
);

const boundary = priceBooking(show, [{ tierName: 'Silver', quantity: 1 }], {
  offers: [percentDiscount({ percent: 40 })],
  convenienceFeePaisa: toPaisa(30),
});
assert.equal(boundary.lines[0].gstRate, 0.12);

console.log('cinema pricing engine tests passed');