import {
  addHoursToClockTime,
  encodePackageComment,
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
