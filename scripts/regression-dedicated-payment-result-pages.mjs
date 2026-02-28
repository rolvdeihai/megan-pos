import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const pendingPagePath = new URL('../src/app/payment/pending/page.tsx', import.meta.url);
const successPagePath = new URL('../src/app/payment/success/page.tsx', import.meta.url);
const failedPagePath = new URL('../src/app/payment/failed/page.tsx', import.meta.url);

const pendingPage = await readFile(pendingPagePath, 'utf8');
const successPage = await readFile(successPagePath, 'utf8');
const failedPage = await readFile(failedPagePath, 'utf8');

assert.ok(
  pendingPage.includes('return `/payment/${status}?${params.toString()}`;'),
  'Pending flow should navigate outcomes to dedicated /payment/success and /payment/failed pages'
);

assert.ok(
  successPage.includes('Pembayaran Berhasil') && successPage.includes('/dashboard/billing'),
  'Dedicated payment success page should confirm success and provide billing CTA'
);

assert.ok(
  failedPage.includes('Pembayaran Gagal') && failedPage.includes('Coba Lagi Pembayaran'),
  'Dedicated payment failed page should confirm failure and provide retry CTA'
);

console.log('PASS: dedicated payment success/failed pages wired from pending flow');
