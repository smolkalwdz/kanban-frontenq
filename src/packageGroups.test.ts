import {
  addHoursToClockTime,
  buildPackagePreset,
  encodePackageComment,
  getPackageEndDateFromActiveStart,
  getPackageGuestsTotal,
  isMixedPackageZone,
  parsePackageComment,
} from './packageGroups';

test('enables mixed packages only for Polevaya zone 20 tableId 42', () => {
  expect(isMixedPackageZone('Полевая', 42)).toBe(true);
  expect(isMixedPackageZone('МСК', 42)).toBe(false);
  expect(isMixedPackageZone('Полевая', 20)).toBe(false);
});

test('encodes and parses package groups inside booking comment', () => {
  const encoded = encodePackageComment([
    { hours: 2, guests: 3 },
    { hours: 3, guests: 2 },
  ], 'окно');

  expect(parsePackageComment(encoded)).toEqual({
    groups: [
      { hours: 2, guests: 3 },
      { hours: 3, guests: 2 },
    ],
    comment: 'окно',
  });
});

test('calculates package end times and guest total', () => {
  expect(addHoursToClockTime('23:30', 2)).toBe('01:30');
  expect(getPackageGuestsTotal([
    { hours: 2, guests: 3 },
    { hours: 3, guests: 2 },
  ])).toBe(5);
});

test('package groups are optional and plain comments stay plain', () => {
  expect(encodePackageComment([], 'обычная бронь')).toBe('обычная бронь');
  expect(parsePackageComment('обычная бронь')).toEqual({ groups: [], comment: 'обычная бронь' });
});

test('builds quick presets for all guests', () => {
  expect(buildPackagePreset('time', 5)).toEqual({ groups: [], endTime: undefined });
  expect(buildPackagePreset('unlimited', 5)).toEqual({ groups: [], endTime: '' });
  expect(buildPackagePreset('2h', 5)).toEqual({ groups: [{ hours: 2, guests: 5 }], endTime: '' });
  expect(buildPackagePreset('3h', 5)).toEqual({ groups: [{ hours: 3, guests: 5 }], endTime: '' });
});

test('calculates package end from active start, not from booking time', () => {
  expect(getPackageEndDateFromActiveStart('2026-07-28T18:10:00.000Z', 2).toISOString())
    .toBe('2026-07-28T20:10:00.000Z');
});
