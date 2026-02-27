import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const checkoutActionsPath = new URL('../src/app/checkout/actions.ts', import.meta.url);
const checkoutPagePath = new URL('../src/app/checkout/page.tsx', import.meta.url);

const checkoutActions = await readFile(checkoutActionsPath, 'utf8');
const checkoutPage = await readFile(checkoutPagePath, 'utf8');

assert.ok(
  checkoutActions.includes('/dashboard/billing?status=success&order_id='),
  'Live success redirect should return to billing status page'
);

assert.ok(
  checkoutActions.includes('/dashboard/billing?status=failed&order_id='),
  'Live failure redirect should return to billing status page'
);

assert.ok(
  checkoutPage.includes('if (result.simulation)'),
  'Checkout should keep a dedicated simulation branch'
);

assert.ok(
  checkoutPage.includes('router.push(`/payment/pending?'),
  'Simulation checkout should navigate to local pending payment page'
);

assert.ok(
  checkoutPage.includes('window.location.href = result.invoiceUrl'),
  'Live checkout should redirect user to Xendit hosted invoice page'
);

console.log('PASS: checkout flow is switchable via XENDIT_MODE config');
