import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeOrderTabs, filterOrdersByTab } from '../src/lib/orders-dashboard-utils.js';

const sampleOrders = [
  { id: '1', status: 'pending' },
  { id: '2', status: 'preparing' },
  { id: '3', status: 'completed' },
  { id: '4', status: 'completed' },
];

test('summarizeOrderTabs returns active/completed counts from full data set', () => {
  const summary = summarizeOrderTabs(sampleOrders);

  assert.equal(summary.active, 2);
  assert.equal(summary.completed, 2);
});

test('filterOrdersByTab returns only active orders for pending tab', () => {
  const filtered = filterOrdersByTab(sampleOrders, 'pending');

  assert.equal(filtered.length, 2);
  assert.ok(filtered.every((order) => order.status !== 'completed'));
});

test('filterOrdersByTab returns only completed orders for completed tab', () => {
  const filtered = filterOrdersByTab(sampleOrders, 'completed');

  assert.equal(filtered.length, 2);
  assert.ok(filtered.every((order) => order.status === 'completed'));
});
