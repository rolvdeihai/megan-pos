import { supabase } from '@/lib/supabase';

const BOOKING_DURATION_MS = 2 * 60 * 60 * 1000;

export type TableOrderStatus = {
  table_id: string | null;
  status?: string | null;
  scheduled_time?: string | null;
  created_at?: string | null;
};

type TableLike = {
  id: string;
  table_number?: string | null;
  table_name?: string | null;
  capacity?: number | null;
  is_available?: boolean | null;
};

export type TableAvailabilityMeta = {
  is_occupied_now: boolean;
  has_conflict_at_selected_time: boolean;
  is_selectable: boolean;
  availability_label: string;
  availability_hint: string | null;
  selected_slot_label: string;
  today_booking_ranges: string[];
  has_upcoming_booking: boolean;
  next_booking_start: string | null;
};

export type TableVisualStatus = 'available' | 'occupied' | 'reserved';

const ACTIVE_ORDER_STATUSES = new Set(['pending', 'confirmed', 'processing']);

function parseDate(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getOrderStart(order: TableOrderStatus) {
  return parseDate(order.scheduled_time) || parseDate(order.created_at);
}

function getOrderEnd(order: TableOrderStatus) {
  const start = getOrderStart(order);
  if (!start) return null;
  return new Date(start.getTime() + BOOKING_DURATION_MS);
}

function intervalsOverlap(startA: Date, endA: Date, startB: Date, endB: Date) {
  return startA < endB && startB < endA;
}

function isWithinInterval(target: Date, start: Date, end: Date) {
  return target >= start && target < end;
}

function formatTime24(date: Date) {
  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

export function buildTableAvailability<T extends TableLike>(
  tables: T[],
  orders: TableOrderStatus[],
  selectedTime?: string | null
): Array<T & TableAvailabilityMeta> {
  const now = new Date();
  const selectedDate = parseDate(selectedTime) || now;
  const hasSelectedTime = Boolean(parseDate(selectedTime));
  const selectedEnd = new Date(selectedDate.getTime() + BOOKING_DURATION_MS);
  const startOfDay = new Date(selectedDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(selectedDate);
  endOfDay.setHours(23, 59, 59, 999);

  return tables.map((table) => {
    const activeOrders = orders.filter((order) => {
      if (order.table_id !== table.id) return false;
      if (!order.status) return true;
      return ACTIVE_ORDER_STATUSES.has(order.status);
    });

    const bookingIntervals = activeOrders
      .map((order) => {
        const start = getOrderStart(order);
        const end = getOrderEnd(order);
        if (!start || !end) return null;
        return { start, end };
      })
      .filter((value): value is { start: Date; end: Date } => Boolean(value))
      .sort((a, b) => a.start.getTime() - b.start.getTime());

    const todayBookingRanges = bookingIntervals
      .filter(({ start, end }) => intervalsOverlap(start, end, startOfDay, endOfDay))
      .map(({ start, end }) => `${formatTime24(start)} - ${formatTime24(end)}`);

    const isOccupiedNow =
      table.is_available === false ||
      bookingIntervals.some(({ start, end }) => isWithinInterval(now, start, end));

    const selectedConflict = bookingIntervals.find(({ start, end }) =>
      intervalsOverlap(start, end, selectedDate, selectedEnd)
    );

    const selectedSlotLabel = `${formatTime24(selectedDate)} - ${formatTime24(selectedEnd)}`;
    const upcomingBooking = bookingIntervals.find(({ start }) => start > now);
    const hasUpcomingBooking = Boolean(upcomingBooking);
    const nextBookingStart = upcomingBooking ? upcomingBooking.start.toISOString() : null;

    if (selectedConflict) {
      return {
        ...table,
        is_occupied_now: isOccupiedNow,
        has_conflict_at_selected_time: true,
        is_selectable: false,
        availability_label: hasSelectedTime ? 'Tidak tersedia' : 'Sedang dipakai',
        availability_hint: `Terpakai ${formatTime24(selectedConflict.start)} - ${formatTime24(selectedConflict.end)}`,
        selected_slot_label: selectedSlotLabel,
        today_booking_ranges: todayBookingRanges,
        has_upcoming_booking: hasUpcomingBooking,
        next_booking_start: nextBookingStart,
      };
    }

    if (isOccupiedNow) {
      return {
        ...table,
        is_occupied_now: true,
        has_conflict_at_selected_time: false,
        is_selectable: true,
        availability_label: hasSelectedTime ? 'Bisa dibooking nanti' : 'Sedang dipakai',
        availability_hint: hasSelectedTime
          ? `Sekarang penuh, tapi kosong di slot ${selectedSlotLabel}`
          : 'Pilih waktu dulu untuk cek slot berikutnya',
        selected_slot_label: selectedSlotLabel,
        today_booking_ranges: todayBookingRanges,
        has_upcoming_booking: hasUpcomingBooking,
        next_booking_start: nextBookingStart,
      };
    }

    return {
      ...table,
      is_occupied_now: false,
      has_conflict_at_selected_time: false,
      is_selectable: true,
      availability_label: 'Kosong',
      availability_hint: hasSelectedTime ? `Tersedia di slot ${selectedSlotLabel}` : null,
      selected_slot_label: selectedSlotLabel,
      today_booking_ranges: todayBookingRanges,
      has_upcoming_booking: hasUpcomingBooking,
      next_booking_start: nextBookingStart,
    };
  });
}

export function getTableVisualStatus(table: Pick<TableAvailabilityMeta, 'is_occupied_now' | 'has_upcoming_booking'>): TableVisualStatus {
  if (table.is_occupied_now) return 'occupied';
  if (table.has_upcoming_booking) return 'reserved';
  return 'available';
}

/**
 * Check if a table already has an active order overlapping the requested 2-hour booking slot.
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

  // A booking reserves the table for 2 hours.
  const requestedDate = new Date(scheduledTime);
  const requestedEnd = new Date(requestedDate.getTime() + BOOKING_DURATION_MS);
  const after = requestedEnd.toISOString();

  let query = supabase
    .from('orders')
    .select('id, scheduled_time, created_at')
    .eq('user_id', userId)
    .eq('table_id', tableId)
    .not('status', 'in', '("completed","cancelled")');

  if (excludeOrderId) {
    query = query.neq('id', excludeOrderId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Conflict check error:', error);
    return true; // treat as conflict to be safe
  }

  return (data || []).some((order) => {
    const existingStart = parseDate(order.scheduled_time) || parseDate(order.created_at);
    if (!existingStart) return true;
    const existingEnd = new Date(existingStart.getTime() + BOOKING_DURATION_MS);
    return intervalsOverlap(existingStart, existingEnd, requestedDate, requestedEnd);
  });
}