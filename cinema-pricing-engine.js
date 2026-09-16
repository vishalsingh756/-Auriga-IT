'use strict';

/**
 * Reusable cinema pricing engine. Monetary values are integer paisa internally.
 */

const PAISA_PER_RUPEE = 100;

function toPaisa(rupees) {
  return Math.round(rupees * PAISA_PER_RUPEE);
}

function formatMoney(paisa) {
  const sign = paisa < 0 ? '-' : '';
  const absolute = Math.round(Math.abs(paisa));
  const rupees = Math.floor(absolute / PAISA_PER_RUPEE);
  const paise = absolute % PAISA_PER_RUPEE;
  return `${sign}\u20B9${rupees.toLocaleString('en-IN')}.${String(paise).padStart(2, '0')}`;
}

function roundHalfUp(value) {
  return Math.floor(value + 0.5);
}

class PricingError extends Error {}

class SeatTier {
  constructor(name, pricePaisa, totalSeats, seatsSold = 0) {
    this.name = name;
    this.pricePaisa = pricePaisa;
    this.totalSeats = totalSeats;
    this.seatsSold = seatsSold;
  }

  get available() {
    return this.totalSeats - this.seatsSold;
  }

  get isSoldOut() {
    return this.available <= 0;
  }
}

class Show {
  constructor(tiers) {
    this.tiers = new Map(tiers.map((tier) => [tier.name, tier]));
  }

  getTier(name) {
    const tier = this.tiers.get(name);
    if (!tier) throw new PricingError(`Unknown seat tier: "${name}"`);
    return tier;
  }
}

function flatDiscount({ amountPaisa, minSubtotalPaisa = 0, label = 'Festival discount' }) {
  return { kind: 'FLAT', amountPaisa, minSubtotalPaisa, label };
}

function percentDiscount({ percent, capPaisa = Infinity, label = 'Member discount' }) {
  return { kind: 'PERCENT', percent, capPaisa, label };
}

const DEFAULT_GST_SLABS = [
  { uptoPaisa: 10000, rate: 0.12 },
  { uptoPaisa: Infinity, rate: 0.18 },
];

function gstRateForUnitPrice(unitPricePaisa, slabs) {
  for (const slab of slabs) {
    if (unitPricePaisa <= slab.uptoPaisa) return slab.rate;
  }
  return slabs[slabs.length - 1].rate;
}

function priceBooking(show, requestedSeats, {
  offers = [],
  convenienceFeePaisa = 3000,
  convenienceFeeGstRate = 0.18,
  gstSlabs = DEFAULT_GST_SLABS,
} = {}) {
  const lines = [];
  for (const { tierName, quantity } of requestedSeats) {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new PricingError(`Quantity for ${tierName} must be a positive whole number`);
    }
    const tier = show.getTier(tierName);
    if (tier.isSoldOut) {
      throw new PricingError(`${tier.name} is sold out — no seats bookable`);
    }
    if (quantity > tier.available) {
      throw new PricingError(`Only ${tier.available} ${tier.name} seat(s) left, ${quantity} requested`);
    }
    lines.push({
      tierName: tier.name,
      quantity,
      unitPricePaisa: tier.pricePaisa,
      subtotalPaisa: tier.pricePaisa * quantity,
    });
  }
  if (lines.length === 0) throw new PricingError('No seats in booking');

  const subtotalPaisa = lines.reduce((sum, line) => sum + line.subtotalPaisa, 0);
  let running = subtotalPaisa;
  const discountEntries = [];
  for (const offer of offers) {
    let amount = 0;
    if (offer.kind === 'FLAT') {
      if (subtotalPaisa >= offer.minSubtotalPaisa) amount = Math.min(offer.amountPaisa, running);
    } else if (offer.kind === 'PERCENT') {
      const raw = roundHalfUp((running * offer.percent) / 100);
      amount = Math.min(raw, offer.capPaisa, running);
    } else {
      throw new PricingError(`Unknown offer kind: ${offer.kind}`);
    }
    if (amount > 0) {
      discountEntries.push({ label: offer.label, amountPaisa: amount });
      running -= amount;
    }
  }

  const totalDiscountPaisa = subtotalPaisa - running;
  const discountedSubtotalPaisa = running;
  const ticketLines = distributeProRata(lines, totalDiscountPaisa);
  const totalQty = lines.reduce((sum, line) => sum + line.quantity, 0);
  const feeSubtotalPaisa = convenienceFeePaisa * totalQty;

  let ticketGstPaisa = 0;
  for (const line of ticketLines) {
    const unitDiscountedPrice = Math.round(line.discountedSubtotalPaisa / line.quantity);
    line.gstRate = gstRateForUnitPrice(unitDiscountedPrice, gstSlabs);
    line.gstPaisa = roundHalfUp(line.discountedSubtotalPaisa * line.gstRate);
    ticketGstPaisa += line.gstPaisa;
  }
  const feeGstPaisa = roundHalfUp(feeSubtotalPaisa * convenienceFeeGstRate);

  return {
    lines: ticketLines,
    subtotalPaisa,
    discounts: discountEntries,
    totalDiscountPaisa,
    discountedSubtotalPaisa,
    convenienceFee: {
      quantity: totalQty,
      perTicketPaisa: convenienceFeePaisa,
      subtotalPaisa: feeSubtotalPaisa,
      gstRate: convenienceFeeGstRate,
      gstPaisa: feeGstPaisa,
    },
    ticketGstPaisa,
    grandTotalPaisa: discountedSubtotalPaisa + feeSubtotalPaisa + ticketGstPaisa + feeGstPaisa,
  };
}

function distributeProRata(lines, totalDiscountPaisa) {
  if (totalDiscountPaisa === 0) {
    return lines.map((line) => ({
      ...line,
      discountPaisa: 0,
      discountedSubtotalPaisa: line.subtotalPaisa,
    }));
  }
  const subtotalPaisa = lines.reduce((sum, line) => sum + line.subtotalPaisa, 0);
  const shares = lines.map((line) => {
    const exact = (totalDiscountPaisa * line.subtotalPaisa) / subtotalPaisa;
    const floor = Math.floor(exact);
    return { line, floor, remainder: exact - floor };
  });
  const allocated = shares.reduce((sum, share) => sum + share.floor, 0);
  const leftover = totalDiscountPaisa - allocated;
  shares.sort((a, b) => b.remainder - a.remainder);
  for (let index = 0; index < leftover; index += 1) {
    shares[index % shares.length].floor += 1;
  }
  return shares.map(({ line, floor }) => ({
    ...line,
    discountPaisa: floor,
    discountedSubtotalPaisa: line.subtotalPaisa - floor,
  }));
}

function printReceipt(result) {
  const width = 46;
  const row = (label, value) => label.padEnd(width - 12) + value.padStart(12);
  const output = ['-'.repeat(width), 'BOOKING RECEIPT', '-'.repeat(width)];
  for (const line of result.lines) {
    output.push(row(`${line.tierName} x${line.quantity} @ ${formatMoney(line.unitPricePaisa)}`, formatMoney(line.subtotalPaisa)));
  }
  output.push('-'.repeat(width));
  output.push(row('Subtotal', formatMoney(result.subtotalPaisa)));
  for (const discount of result.discounts) {
    output.push(row(`  ${discount.label}`, '-' + formatMoney(discount.amountPaisa)));
  }
  output.push(row('Discounted subtotal', formatMoney(result.discountedSubtotalPaisa)));
  output.push(row(
    `Convenience fee x${result.convenienceFee.quantity} @ ${formatMoney(result.convenienceFee.perTicketPaisa)}`,
    formatMoney(result.convenienceFee.subtotalPaisa),
  ));
  for (const line of result.lines) {
    output.push(row(`  GST on ${line.tierName} @ ${(line.gstRate * 100).toFixed(0)}%`, formatMoney(line.gstPaisa)));
  }
  output.push(row(
    `  GST on convenience fee @ ${(result.convenienceFee.gstRate * 100).toFixed(0)}%`,
    formatMoney(result.convenienceFee.gstPaisa),
  ));
  output.push('='.repeat(width));
  output.push(row('GRAND TOTAL', formatMoney(result.grandTotalPaisa)));
  output.push('='.repeat(width));
  return output.join('\n');
}

module.exports = {
  SeatTier,
  Show,
  PricingError,
  flatDiscount,
  percentDiscount,
  priceBooking,
  printReceipt,
  formatMoney,
  toPaisa,
  DEFAULT_GST_SLABS,
};