const PAISA_PER_RUPEE = 100;

function toPaisa(rupees) {
  return Math.round(rupees * PAISA_PER_RUPEE);
}

function formatMoney(paisa) {
  const sign = paisa < 0 ? '-' : '';
  const abs = Math.round(Math.abs(paisa));
  const rupees = Math.floor(abs / PAISA_PER_RUPEE);
  const paise = abs % PAISA_PER_RUPEE;
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

function printReceipt(result) {
  const W = 46;
  const row = (label, value) => label.padEnd(W - 12) + value.padStart(12);
  const out = [];
  out.push('-'.repeat(W));
  out.push('BOOKING RECEIPT');
  out.push('-'.repeat(W));
  for (const line of result.lines) {
    out.push(row(`${line.tierName} x${line.quantity} @ ${formatMoney(line.unitPricePaisa)}`, formatMoney(line.subtotalPaisa)));
  }
  out.push('-'.repeat(W));
  out.push(row('Subtotal', formatMoney(result.subtotalPaisa)));
  for (const discount of result.discounts) {
    out.push(row(`  ${discount.label}`, '-' + formatMoney(discount.amountPaisa)));
  }
  out.push(row('Discounted subtotal', formatMoney(result.discountedSubtotalPaisa)));
  out.push(row(
    `Convenience fee x${result.convenienceFee.quantity} @ ${formatMoney(result.convenienceFee.perTicketPaisa)}`,
    formatMoney(result.convenienceFee.subtotalPaisa),
  ));
  for (const line of result.lines) {
    out.push(row(`  GST on ${line.tierName} @ ${(line.gstRate * 100).toFixed(0)}%`, formatMoney(line.gstPaisa)));
  }
  out.push(row(
    `  GST on convenience fee @ ${(result.convenienceFee.gstRate * 100).toFixed(0)}%`,
    formatMoney(result.convenienceFee.gstPaisa),
  ));
  out.push('='.repeat(W));
  out.push(row('GRAND TOTAL', formatMoney(result.grandTotalPaisa)));
  out.push('='.repeat(W));
  return out.join('\n');
}

const show = new Show([
  new SeatTier('Silver', toPaisa(150), 100, 40),
  new SeatTier('Gold', toPaisa(250), 80, 79),
  new SeatTier('Recliner', toPaisa(450), 20, 20),
]);

function collectBooking() {
  const tiers = ['Silver', 'Gold', 'Recliner'];
  const requestedSeats = tiers
    .map((name) => {
      const value = Number(document.getElementById(`${name.toLowerCase()}Qty`).value || 0);
      return value > 0 ? { tierName: name, quantity: value } : null;
    })
    .filter(Boolean);

  const festivalDiscount = Number(document.getElementById('festivalDiscount').value || 0);
  const memberPercent = Number(document.getElementById('memberPercent').value || 0);
  const memberCap = Number(document.getElementById('memberCap').value || 0);
  const convenienceFee = Number(document.getElementById('convenienceFee').value || 0);

  const offers = [];
  if (festivalDiscount > 0) {
    offers.push(flatDiscount({
      amountPaisa: toPaisa(festivalDiscount),
      minSubtotalPaisa: toPaisa(300),
      label: 'Festival discount',
    }));
  }
  if (memberPercent > 0) {
    offers.push(percentDiscount({
      percent: memberPercent,
      capPaisa: toPaisa(memberCap),
      label: 'Member discount',
    }));
  }

  return priceBooking(show, requestedSeats, {
    offers,
    convenienceFeePaisa: toPaisa(convenienceFee),
  });
}

function renderResult(result) {
  document.getElementById('subtotalValue').textContent = formatMoney(result.subtotalPaisa);
  document.getElementById('discountValue').textContent = '-' + formatMoney(result.totalDiscountPaisa);
  document.getElementById('grandTotalValue').textContent = formatMoney(result.grandTotalPaisa);
  document.getElementById('receiptOutput').textContent = printReceipt(result);
}

function loadSample() {
  document.getElementById('silverQty').value = 3;
  document.getElementById('goldQty').value = 1;
  document.getElementById('reclinerQty').value = 0;
  document.getElementById('festivalDiscount').value = 50;
  document.getElementById('memberPercent').value = 10;
  document.getElementById('memberCap').value = 100;
  document.getElementById('convenienceFee').value = 30;
  renderResult(collectBooking());
}

document.getElementById('booking-form').addEventListener('submit', (event) => {
  event.preventDefault();
  try {
    renderResult(collectBooking());
  } catch (error) {
    document.getElementById('receiptOutput').textContent = error instanceof PricingError ? error.message : String(error);
    document.getElementById('subtotalValue').textContent = '₹0.00';
    document.getElementById('discountValue').textContent = '₹0.00';
    document.getElementById('grandTotalValue').textContent = '₹0.00';
  }
});

document.getElementById('load-sample').addEventListener('click', loadSample);
loadSample();
