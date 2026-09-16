/**
 * Cinema Pricing Engine (React version)
 * All calculations in paisa internally
 */

const PAISA_PER_RUPEE = 100;

export function toPaisa(rupees) {
  return Math.round(rupees * PAISA_PER_RUPEE);
}

export function formatMoney(paisa) {
  const sign = paisa < 0 ? '-' : '';
  const abs = Math.round(Math.abs(paisa));
  const rupees = Math.floor(abs / 100);
  const paise = abs % 100;
  return `${sign}₹${rupees.toLocaleString('en-IN')}.${String(paise).padStart(2, '0')}`;
}

function roundHalfUp(x) {
  return Math.floor(x + 0.5);
}

export const DEFAULT_GST_SLABS = [
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
    return lines.map((l) => ({ ...l, discountPaisa: 0, discountedSubtotalPaisa: l.subtotalPaisa }));
  }
  const subtotalPaisa = lines.reduce((s, l) => s + l.subtotalPaisa, 0);
  const shares = lines.map((l) => {
    const exact = (totalDiscountPaisa * l.subtotalPaisa) / subtotalPaisa;
    const floor = Math.floor(exact);
    return { line: l, floor, remainder: exact - floor };
  });
  const allocated = shares.reduce((s, x) => s + x.floor, 0);
  const leftover = totalDiscountPaisa - allocated;
  shares.sort((a, b) => b.remainder - a.remainder);
  for (let i = 0; i < leftover; i++) {
    shares[i % shares.length].floor += 1;
  }
  return shares.map(({ line, floor }) => ({
    ...line,
    discountPaisa: floor,
    discountedSubtotalPaisa: line.subtotalPaisa - floor,
  }));
}

export function priceBooking(tiers, requestedSeats, opts = {}) {
  const {
    offers = [],
    convenienceFeePaisa = 0,
    convenienceFeeGstRate = 0.18,
    gstSlabs = DEFAULT_GST_SLABS,
  } = opts;
  const lines = [];
  for (const { tierName, quantity } of requestedSeats) {
    if (quantity <= 0) continue;
    const tier = tiers.find((t) => t.name === tierName);
    if (!tier) continue;
    const available = tier.available ?? tier.totalSeats - tier.seatsSold;
    const qty = Math.min(quantity, available);
    if (qty <= 0) continue;

    lines.push({
      tierName: tier.name,
      quantity: qty,
      unitPricePaisa: tier.pricePaisa,
      subtotalPaisa: tier.pricePaisa * qty,
    });
  }
  if (lines.length === 0) return null;

  const subtotalPaisa = lines.reduce((s, l) => s + l.subtotalPaisa, 0);
  let running = subtotalPaisa;
  const discountEntries = [];

  for (const offer of offers) {
    let amount = 0;
    if (offer.kind === 'FLAT') {
      if (subtotalPaisa >= offer.minSubtotalPaisa) {
        amount = Math.min(offer.amountPaisa, running);
      }
    } else if (offer.kind === 'PERCENT') {
      const raw = roundHalfUp((running * offer.percent) / 100);
      amount = Math.min(raw, offer.capPaisa, running);
    }
    if (amount > 0) {
      discountEntries.push({ label: offer.label, amountPaisa: amount });
      running -= amount;
    }
  }

  const totalDiscountPaisa = subtotalPaisa - running;
  const discountedSubtotalPaisa = running;
  const ticketLines = distributeProRata(lines, totalDiscountPaisa);
  const totalQty = lines.reduce((s, l) => s + l.quantity, 0);
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

export function printReceipt(result) {
  const W = 42;
  const row = (label, value) => label.padEnd(W - 12) + value.padStart(12);
  const out = [];
  out.push('-'.repeat(W));
  out.push('BOOKING RECEIPT');
  out.push('-'.repeat(W));
  for (const l of result.lines) {
    out.push(row(`${l.tierName} x${l.quantity}`, formatMoney(l.subtotalPaisa)));
  }
  out.push('-'.repeat(W));
  out.push(row('Subtotal', formatMoney(result.subtotalPaisa)));
  for (const d of result.discounts) {
    out.push(row(`  ${d.label}`, '-' + formatMoney(d.amountPaisa)));
  }
  out.push(row('Discounted subtotal', formatMoney(result.discountedSubtotalPaisa)));
  out.push(row(`Convenience fee x${result.convenienceFee.quantity}`, formatMoney(result.convenienceFee.subtotalPaisa)));
  for (const l of result.lines) {
    out.push(row(`  GST @ ${(l.gstRate * 100).toFixed(0)}%`, formatMoney(l.gstPaisa)));
  }
  out.push(row(`  Fee GST @ 18%`, formatMoney(result.convenienceFee.gstPaisa)));
  out.push('='.repeat(W));
  out.push(row('GRAND TOTAL', formatMoney(result.grandTotalPaisa)));
  out.push('='.repeat(W));
  return out.join('\n');
}
