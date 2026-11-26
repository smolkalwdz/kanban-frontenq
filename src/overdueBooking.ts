export interface OverdueBookingInput {
  time: string;
  isActive: boolean;
}

export interface BookingOverdueInfo {
  minutesOver: number;
}

const OVERDUE_AFTER_MS = 30 * 60 * 1000;

export function getBookingOverdueInfo(
  booking: OverdueBookingInput,
  now: Date = new Date(),
): BookingOverdueInfo | null {
  if (booking.isActive || !/^\d{2}:\d{2}$/.test(booking.time)) return null;

  const [hours, minutes] = booking.time.split(':').map(Number);
  if (hours > 23 || minutes > 59) return null;

  const scheduledAt = new Date(now);
  scheduledAt.setHours(hours, minutes, 0, 0);
  const elapsedMs = now.getTime() - scheduledAt.getTime();

  if (elapsedMs < OVERDUE_AFTER_MS) return null;

  return { minutesOver: Math.floor((elapsedMs - OVERDUE_AFTER_MS) / 60000) };
}
