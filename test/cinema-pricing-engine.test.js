'use strict';

const assert = require('node:assert/strict');
const {
  SeatTier, Show, PricingError, flatDiscount, percentDiscount, priceBooking, toPaisa,
} = require('../cinema-pricing-engine');

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