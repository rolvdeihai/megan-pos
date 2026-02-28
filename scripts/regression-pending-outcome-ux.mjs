import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const pendingPagePath = new URL('../src/app/payment/pending/page.tsx', import.meta.url);
const pendingPage = await readFile(pendingPagePath, 'utf8');

assert.ok(
  pendingPage.includes('RESULT_REDIRECT_DELAY_MS'),
  'Pending page should use a redirect delay constant before opening result pages'
);

assert.ok(
  pendingPage.includes("redirectToResult('success')"),
  'Simulation success should route to dedicated success result page'
);

assert.ok(
  pendingPage.includes("redirectToResult('failed')"),
  'Simulation failure should route to dedicated failed result page'
);

assert.ok(
  pendingPage.includes('return `/payment/${status}?${params.toString()}`;'),
  'Pending page should build URL for dedicated payment success/failed pages'
);

assert.ok(
  !pendingPage.includes('/dashboard/billing?status=success&order_id='),
  'Pending simulation success should no longer redirect directly to billing'
);

assert.ok(
  !pendingPage.includes('/dashboard/billing?status=failed&order_id='),
  'Pending simulation failure should no longer redirect directly to billing'
);

console.log('PASS: pending flow uses dedicated success/failed pages with delayed redirect');
