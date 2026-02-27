import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const checkoutPagePath = new URL('../src/app/checkout/page.tsx', import.meta.url);
const pendingPagePath = new URL('../src/app/payment/pending/page.tsx', import.meta.url);

const checkoutPage = await readFile(checkoutPagePath, 'utf8');
const pendingPage = await readFile(pendingPagePath, 'utf8');

assert.ok(
  !checkoutPage.includes("router.push('/dashboard/billing?status=success')"),
  'Checkout should not jump directly to billing success in simulation mode'
);

assert.ok(
  checkoutPage.includes('router.push(`/payment/pending?'),
  'Checkout should navigate to payment pending flow after pay click'
);

assert.ok(
  pendingPage.includes('simulatePaymentSuccess') && pendingPage.includes('simulatePaymentFailure'),
  'Payment pending page should expose simulation controls for local/dev testing'
);

console.log('PASS: checkout simulation path routes through payment pending page');
