import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const checkoutPagePath = new URL('../src/app/checkout/page.tsx', import.meta.url);
const pendingPagePath = new URL('../src/app/payment/pending/page.tsx', import.meta.url);

const checkoutPage = await readFile(checkoutPagePath, 'utf8');
const pendingPage = await readFile(pendingPagePath, 'utf8');

assert.ok(
  checkoutPage.includes("simulation: '1'"),
  'Checkout simulation flow should forward an explicit simulation flag to /payment/pending'
);

assert.ok(
  pendingPage.includes("searchParams.get('simulation')") || pendingPage.includes("invoiceId?.startsWith('sim_')"),
  'Pending page should infer simulation mode from URL data when env is unavailable on client'
);

console.log('PASS: pending page exposes simulation controls for simulation checkout URLs');
