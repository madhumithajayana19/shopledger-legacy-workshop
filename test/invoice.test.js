const test = require('node:test');
const assert = require('node:assert').strict;
const invoice = require('../lib/invoice');
const pricing = require('../lib/pricing');

function invoiceAmounts(order) {
  const { rows, ...totals } = invoice.computeInvoiceFigures(order);
  return {
    ...totals,
    rows: rows.map(({ gstPercent, line, lineTax }) => ({ gstPercent, line, lineTax }))
  };
}

// Like saved order lines, the first three examples have HSN codes without explicit GST rates.
test('#1001 invoice uses the 5% and 12% HSN slabs', () => {
  const order = {
    id: 1001,
    coupon: '',
    items: [
      { name: 'Rice', hsn: '1006', price: 90, qty: 1 },
      { name: 'Ghee', hsn: '0405', price: 260, qty: 2 }
    ]
  };
  const checkout = pricing.computeTotals(order.items, order.coupon);

  assert.deepStrictEqual(invoiceAmounts(order), {
    subtotal: 610,
    discount: 0,
    tax: 66.9,
    cgst: 33.45,
    sgst: 33.45,
    total: 676.9,
    rows: [
      { gstPercent: 5, line: 90, lineTax: 4.5 },
      { gstPercent: 12, line: 520, lineTax: 62.4 }
    ]
  });
  assert.deepStrictEqual(checkout.lines.map(({ gstPercent }) => gstPercent), [5, 12]);
  assert.equal(checkout.tax, 66.9);
  assert.equal(checkout.total, 676.9);
});

test('#1002 invoice applies SAVE10 before GST', () => {
  const order = {
    id: 1002,
    coupon: 'SAVE10',
    items: [
      { name: 'Rice', hsn: '1006', price: 640, qty: 1 },
      { name: 'Sunflower oil', hsn: '1512', price: 190, qty: 2 }
    ]
  };
  const checkout = pricing.computeTotals(order.items, order.coupon);

  assert.deepStrictEqual(invoiceAmounts(order), {
    subtotal: 1020,
    discount: 102,
    tax: 45.9,
    cgst: 22.95,
    sgst: 22.95,
    total: 963.9,
    rows: [
      { gstPercent: 5, line: 640, lineTax: 28.8 },
      { gstPercent: 5, line: 380, lineTax: 17.1 }
    ]
  });
  assert.equal(checkout.discount, 102);
  assert.equal(checkout.tax, 45.9);
  assert.equal(checkout.total, 963.9);
});

test('#1004 invoice applies the ₹150 SAVE10 cap', () => {
  const order = {
    id: 1004,
    coupon: 'SAVE10',
    items: [
      { name: 'Rice', hsn: '1006', price: 640, qty: 2 },
      { name: 'Dal', hsn: '0713', price: 480, qty: 2 }
    ]
  };
  const checkout = pricing.computeTotals(order.items, order.coupon);

  assert.deepStrictEqual(invoiceAmounts(order), {
    subtotal: 2240,
    discount: 150,
    tax: 104.5,
    cgst: 52.25,
    sgst: 52.25,
    total: 2194.5,
    rows: [
      { gstPercent: 5, line: 1280, lineTax: 59.71 },
      { gstPercent: 5, line: 960, lineTax: 44.79 }
    ]
  });
  assert.equal(checkout.subtotal, 2240);
  assert.equal(checkout.discount, 150);
  assert.equal(checkout.tax, 104.5);
  assert.equal(checkout.total, 2194.5);
});

test('CURRENT BEHAVIOUR: #1008 all-18% invoice without coupon matches checkout', () => {
  const order = {
    id: 1008,
    coupon: '',
    items: [{ name: 'Tea', hsn: '0902', gstRate: 18, price: 250, qty: 2 }]
  };
  const { lines, taxable, ...checkoutTotals } = pricing.computeTotals(order.items, order.coupon);
  const { rows, ...invoiceTotals } = invoiceAmounts(order);

  assert.deepStrictEqual(invoiceTotals, {
    subtotal: 500,
    discount: 0,
    tax: 90,
    cgst: 45,
    sgst: 45,
    total: 590
  });
  assert.deepStrictEqual(rows, [{ gstPercent: 18, line: 500, lineTax: 90 }]);
  assert.deepStrictEqual(checkoutTotals, invoiceTotals);
});

test('invoice matches checkout for mixed GST slabs and capped SAVE10', () => {
  const items = [
    { name: 'Rice', hsn: '1006', price: 640, qty: 2 },
    { name: 'Ghee', hsn: '0405', price: 480, qty: 2 }
  ];
  const coupon = 'SAVE10';
  const { lines, taxable, ...billed } = pricing.computeTotals(items, coupon);
  const order = { id: 1009, items, coupon, ...billed };

  assert.equal(billed.discount, 150);
  assert.deepStrictEqual(invoiceAmounts(order), {
    ...billed,
    rows: lines.map(({ gstPercent, gross, tax }) => ({
      gstPercent,
      line: gross,
      lineTax: tax
    }))
  });

  const html = invoice.render(order);
  assert.match(html, /<td class="r">5%<\/td><td class="r">₹59\.71<\/td>/);
  assert.match(html, /<td class="r">12%<\/td><td class="r">₹107\.49<\/td>/);
  assert.match(html, /Coupon Discount \(SAVE10\)<\/td><td[^>]*>-₹150\.00/);
  assert.match(html, /CGST<\/td><td class="r">₹83\.60/);
  assert.match(html, /SGST<\/td><td class="r">₹83\.60/);
  assert.match(html, /Total GST<\/td><td class="r">₹167\.20/);
  assert.match(html, /Invoice Total<\/td><td class="r">₹2257\.20/);
  assert.doesNotMatch(html, /Accountant Reconciliation Notice/);
});
