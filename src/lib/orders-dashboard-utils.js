/**
 * @typedef {{ status: string }} OrderLike
 */

/**
 * @param {OrderLike[]} orders
 * @returns {{ active: number; completed: number }}
 */
export function summarizeOrderTabs(orders) {
  const completed = orders.filter((order) => order.status === 'completed').length;

  return {
    active: orders.length - completed,
    completed,
  };
}

/**
 * @template T
 * @param {T[] & OrderLike[]} orders
 * @param {'pending' | 'completed'} tab
 * @returns {T[]}
 */
export function filterOrdersByTab(orders, tab) {
  if (tab === 'completed') {
    return orders.filter((order) => order.status === 'completed');
  }

  return orders.filter((order) => order.status !== 'completed');
}
