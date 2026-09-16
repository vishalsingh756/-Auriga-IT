'use strict';

const {
  SeatTier, Show, priceBooking, printReceipt,
  flatDiscount, percentDiscount, toPaisa, PricingError,
} = require('./cinema-pricing-engine');

const show = new Show([
  new SeatTier('Silver', toPaisa(150), 100, 40),
  new SeatTier('Gold', toPaisa(250), 80, 79),
  new SeatTier('Recliner', toPaisa(450), 20, 20),
]);

console.log('=== Scenario 1: normal booking, festival + capped member offer ===\n');
const scenarioOne = priceBooking(show, [
  { tierName: 'Silver', quantity: 3 },
  { tierName: 'Gold', quantity: 1 },
], {
  offers: [
    flatDiscount({ amountPaisa: toPaisa(50), minSubtotalPaisa: toPaisa(300), label: 'Friday Festival \u20B950 off' }),
    percentDiscount({ percent: 10, capPaisa: toPaisa(100), label: 'Member 10% off (capped \u20B9100)' }),
  ],
  convenienceFeePaisa: toPaisa(30),
});
console.log(printReceipt(scenarioOne));

console.log('\n=== Scenario 2: Recliner is sold out ===\n');
try {
  priceBooking(show, [{ tierName: 'Recliner', quantity: 1 }]);
} catch (error) {
  console.log('Rejected as expected:', error instanceof PricingError, '-', error.message);
}

console.log('\n=== Scenario 3: only 1 Gold seat left, 2 requested ===\n');
try {
  priceBooking(show, [{ tierName: 'Gold', quantity: 2 }]);
} catch (error) {
  console.log('Rejected as expected:', error instanceof PricingError, '-', error.message);
}

console.log('\n=== Scenario 4: paisa-exact stress test (odd %, odd fee, 7 seats) ===\n');
const scenarioFour = priceBooking(show, [{ tierName: 'Silver', quantity: 7 }], {
  offers: [percentDiscount({ percent: 33, label: 'Odd 33% off' })],
  convenienceFeePaisa: toPaisa(19.5),
});
console.log(printReceipt(scenarioFour));
const perLineSum = scenarioFour.lines.reduce((sum, line) => sum + line.discountPaisa, 0);
console.log(`\nSum check: per-line discounts (${perLineSum}) === total discount (${scenarioFour.totalDiscountPaisa}) ->`, perLineSum === scenarioFour.totalDiscountPaisa);

console.log('\n=== Scenario 5: GST slab boundary ===\n');
const scenarioFive = priceBooking(show, [{ tierName: 'Silver', quantity: 1 }], {
  offers: [percentDiscount({ percent: 40, label: 'Deep discount' })],
  convenienceFeePaisa: toPaisa(30),
});
console.log(printReceipt(scenarioFive));
console.log('Ticket GST rate applied:', (scenarioFive.lines[0].gstRate * 100) + '% (expected 12%)');