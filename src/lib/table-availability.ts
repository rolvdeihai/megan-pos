import { supabase } from '@/lib/supabase';

/**
 * Check if a table already has an active order within 45 minutes of the requested time.
 * @param userId - owner id (restaurant id)
 * @param tableId - table to check
 * @param scheduledTime - ISO string or datetime-local string (local time)
 * @param excludeOrderId - optional order id to exclude (useful for updates)
 * @returns true if a conflict exists
 */
export async function checkTableConflict(
  userId: string,
  tableId: string,
  scheduledTime: string,
  excludeOrderId?: string
): Promise<boolean> {
  if (!tableId || !scheduledTime) return false;

  // Convert to Date and calculate the 45‑minute window
  const requestedDate = new Date(scheduledTime);
  const before = new Date(requestedDate.getTime() - 45 * 60 * 1000).toISOString();
  const after = new Date(requestedDate.getTime() + 45 * 60 * 1000).toISOString();

  let query = supabase
    .from('orders')
    .select('id')
    .eq('user_id', userId)
    .eq('table_id', tableId)
    .not('status', 'in', '("completed","cancelled")')
    .gte('scheduled_time', before)
    .lte('scheduled_time', after);

  if (excludeOrderId) {
    query = query.neq('id', excludeOrderId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Conflict check error:', error);
    return true; // treat as conflict to be safe
  }

  return (data?.length ?? 0) > 0;
}