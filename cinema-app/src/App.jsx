import React, { useState, useMemo } from 'react';
import { toPaisa, formatMoney, priceBooking } from './priceEngine';
import './App.css';

const INITIAL_TIERS = [
  { name: 'Silver', price: 150, totalSeats: 100, seatsSold: 40 },
  { name: 'Gold', price: 250, totalSeats: 80, seatsSold: 79 },
  { name: 'Recliner', price: 450, totalSeats: 20, seatsSold: 20 },
];

function Stepper({ value, max, onChange }) {
  return (
    <div className="stepper">
      <button onClick={() => onChange(Math.max(0, value - 1))} disabled={value <= 0} aria-label="Decrease">
        &minus;
      </button>
      <span className="qty mono">{value}</span>
      <button onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label="Increase">
        +
      </button>
    </div>
  );
}

function Switch({ on, onToggle, label }) {
  return (
    <button
      className="switch"
      data-on={on}
      onClick={onToggle}
      aria-pressed={on}
      aria-label={label}
    />
  );
}

export default function TicketCounter({ tiers = INITIAL_TIERS }) {
  const [selections, setSelections] = useState(
    Object.fromEntries(tiers.map((t) => [t.name, 0])),
  );
  const [festival, setFestival] = useState({ enabled: true, amount: 50, min: 300 });
  const [member, setMember] = useState({ enabled: true, percent: 10, cap: 100 });
  const [fee, setFee] = useState(30);

  const requestedSeats = Object.entries(selections)
    .filter(([, qty]) => qty > 0)
    .map(([tierName, quantity]) => ({ tierName, quantity }));

  const offers = [];
  if (festival.enabled) {
    offers.push({
      kind: 'FLAT',
      amountPaisa: toPaisa(Number(festival.amount) || 0),
      minSubtotalPaisa: toPaisa(Number(festival.min) || 0),
      label: `Festival ₹${festival.amount} off`,
    });
  }
  if (member.enabled) {
    offers.push({
      kind: 'PERCENT',
      percent: Number(member.percent) || 0,
      capPaisa: toPaisa(Number(member.cap) || 0) || Infinity,
      label: `Member ${member.percent}% off (capped ₹${member.cap})`,
    });
  }

  const result = useMemo(() => {
    if (requestedSeats.length === 0) return null;
    const tiersWithPaisa = tiers.map((t) => ({
      ...t,
      pricePaisa: toPaisa(t.price),
      available: t.totalSeats - t.seatsSold,
    }));
    return priceBooking(tiersWithPaisa, requestedSeats, {
      offers,
      convenienceFeePaisa: toPaisa(Number(fee) || 0),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(selections), JSON.stringify(festival), JSON.stringify(member), fee, tiers]);

  return (
    <div className="ticket-counter">
      <header className="tc-top">
        <h1>🎬 Ticket Counter</h1>
        <p>Pick seats, toggle offers, watch the bill update to the paisa.</p>
      </header>

      <div className="tc-grid">
        <div>
          <section className="tc-card">
            <h2 className="tc-section-title">SEATS</h2>
            {tiers.map((tier) => {
              const available = tier.totalSeats - tier.seatsSold;
              const soldOut = available <= 0;
              return (
                <div className="tc-tier-row" key={tier.name}>
                  <div className="tc-tier-info">
                    <div className="tc-tier-name">
                      {tier.name} · {formatMoney(toPaisa(tier.price))}
                    </div>
                    {soldOut ? (
                      <div className="tc-tier-meta sold-out">Sold out</div>
                    ) : (
                      <div className="tc-tier-meta">
                        {available} of {tier.totalSeats} left
                      </div>
                    )}
                  </div>
                  <Stepper
                    value={selections[tier.name]}
                    max={available}
                    onChange={(v) => setSelections((s) => ({ ...s, [tier.name]: v }))}
                  />
                </div>
              );
            })}
          </section>

          <section className="tc-card">
            <h2 className="tc-section-title">OFFERS</h2>

            <div className="tc-offer-row">
              <div className="tc-offer-text">
                <div className="tc-offer-title">Festival discount</div>
                <div className="tc-offer-sub">Flat amount off, above a minimum spend</div>
                {festival.enabled && (
                  <div className="tc-field-row">
                    <div className="tc-field">
                      <label>Amount (₹)</label>
                      <input
                        type="number"
                        min={0}
                        value={festival.amount}
                        onChange={(e) => setFestival((f) => ({ ...f, amount: e.target.value }))}
                      />
                    </div>
                    <div className="tc-field">
                      <label>Min spend (₹)</label>
                      <input
                        type="number"
                        min={0}
                        value={festival.min}
                        onChange={(e) => setFestival((f) => ({ ...f, min: e.target.value }))}
                      />
                    </div>
                  </div>
                )}
              </div>
              <Switch
                on={festival.enabled}
                onToggle={() => setFestival((f) => ({ ...f, enabled: !f.enabled }))}
                label="Toggle festival discount"
              />
            </div>

            <div className="tc-offer-row">
              <div className="tc-offer-text">
                <div className="tc-offer-title">Member discount</div>
                <div className="tc-offer-sub">Percentage off, capped at a max amount</div>
                {member.enabled && (
                  <div className="tc-field-row">
                    <div className="tc-field">
                      <label>Percent (%)</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={member.percent}
                        onChange={(e) => setMember((m) => ({ ...m, percent: e.target.value }))}
                      />
                    </div>
                    <div className="tc-field">
                      <label>Cap (₹)</label>
                      <input
                        type="number"
                        min={0}
                        value={member.cap}
                        onChange={(e) => setMember((m) => ({ ...m, cap: e.target.value }))}
                      />
                    </div>
                  </div>
                )}
              </div>
              <Switch
                on={member.enabled}
                onToggle={() => setMember((m) => ({ ...m, enabled: !m.enabled }))}
                label="Toggle member discount"
              />
            </div>
          </section>

          <section className="tc-card">
            <h2 className="tc-section-title">CONVENIENCE FEE</h2>
            <div className="tc-fee-row">
              <div className="tc-offer-sub">Charged per ticket, on top of the discounted price</div>
              <div className="tc-field">
                <label>Per ticket (₹)</label>
                <input type="number" min={0} value={fee} onChange={(e) => setFee(e.target.value)} />
              </div>
            </div>
          </section>
        </div>

        <div className="tc-receipt">
          <section className="tc-card">
            <h2 className="tc-section-title">RECEIPT</h2>
            {!result ? (
              <div className="tc-receipt-empty">Select at least one seat to see the bill.</div>
            ) : (
              <>
                {result.lines.map((l) => (
                  <div className="tc-receipt-line mono" key={l.tierName}>
                    <span>
                      {l.tierName} × {l.quantity}
                    </span>
                    <span>{formatMoney(l.subtotalPaisa)}</span>
                  </div>
                ))}

                <div className="tc-receipt-rule" />

                <div className="tc-receipt-line mono">
                  <span>Subtotal</span>
                  <span>{formatMoney(result.subtotalPaisa)}</span>
                </div>

                {result.discounts.map((d, i) => (
                  <div className="tc-receipt-line mono discount" key={i}>
                    <span>{d.label}</span>
                    <span>−{formatMoney(d.amountPaisa)}</span>
                  </div>
                ))}

                <div className="tc-receipt-line mono" style={{ fontWeight: 500 }}>
                  <span>Discounted subtotal</span>
                  <span>{formatMoney(result.discountedSubtotalPaisa)}</span>
                </div>

                <div className="tc-receipt-line mono">
                  <span>Convenience fee × {result.convenienceFee.quantity}</span>
                  <span>{formatMoney(result.convenienceFee.subtotalPaisa)}</span>
                </div>

                {result.lines.map((l) => (
                  <div className="tc-receipt-line sub mono" key={`gst-${l.tierName}`}>
                    <span>
                      GST on {l.tierName} · {(l.gstRate * 100).toFixed(0)}%
                    </span>
                    <span>{formatMoney(l.gstPaisa)}</span>
                  </div>
                ))}

                <div className="tc-receipt-line sub mono">
                  <span>GST on fee · {(result.convenienceFee.gstRate * 100).toFixed(0)}%</span>
                  <span>{formatMoney(result.convenienceFee.gstPaisa)}</span>
                </div>

                <div className="tc-receipt-total">
                  <span className="label">Total</span>
                  <span className="amount mono">{formatMoney(result.grandTotalPaisa)}</span>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
