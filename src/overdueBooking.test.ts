import { getBookingOverdueInfo } from './overdueBooking';

const now = new Date('2026-11-26T15:30:00');

test('does not mark an invalid booking time as overdue', () => {
  expect(getBookingOverdueInfo({ time: 'later', isActive: false }, now)).toBeNull();
});

test('does not mark an inactive booking overdue before 30 minutes', () => {
  expect(getBookingOverdueInfo({ time: '15:01', isActive: false }, now)).toBeNull();
});

test('marks an inactive booking overdue at 30 minutes', () => {
  expect(getBookingOverdueInfo({ time: '15:00', isActive: false }, now)).toEqual({ minutesOver: 0 });
});

test('does not mark an active booking overdue even after 30 minutes', () => {
  expect(getBookingOverdueInfo({ time: '15:00', isActive: true }, now)).toBeNull();
});
