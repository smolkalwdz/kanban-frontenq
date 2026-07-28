import {
  addHoursToClockTime,
  buildPackagePreset,
  encodePackageComment,
  getPackageEndDateFromActiveStart,
  getPackageGuestsTotal,
  getPackageGroupGuestCounts,
  getPackageGroupEndedInfo,
  getPackageGroupEndingSoonInfo,
  getGuestCountAfterTariffAddition,
  formatPackageRemainingText,
  isMixedPackageZone,
  parsePackageComment,
} from './packageGroups';

test('enables mixed packages for all Polevaya zones only', () => {
  expect(isMixedPackageZone('Полевая', 23)).toBe(true);
  expect(isMixedPackageZone('Полевая', 26)).toBe(true);
  expect(isMixedPackageZone('Полевая', 42)).toBe(true);
  expect(isMixedPackageZone('МСК', 42)).toBe(false);
  expect(isMixedPackageZone('МСК', 20)).toBe(false);
});

test('encodes and parses package groups inside booking comment', () => {
  const encoded = encodePackageComment([
    { kind: 'package', hours: 2, guests: 3 },
    { kind: 'package', hours: 3, guests: 2 },
  ], 'окно');

  expect(parsePackageComment(encoded)).toEqual({
    groups: [
      { kind: 'package', hours: 2, guests: 3 },
      { kind: 'package', hours: 3, guests: 2 },
    ],
    comment: 'окно',
  });
});

test('encodes and parses mixed time, package and unlimited groups', () => {
  const encoded = encodePackageComment([
    { kind: 'time', guests: 2 },
    { kind: 'package', hours: 2, guests: 3 },
    { kind: 'package', hours: 3, guests: 1 },
    { kind: 'unlimited', guests: 4 },
  ], 'смешанная бронь');

  expect(parsePackageComment(encoded)).toEqual({
    groups: [
      { kind: 'time', guests: 2 },
      { kind: 'package', hours: 2, guests: 3 },
      { kind: 'package', hours: 3, guests: 1 },
      { kind: 'unlimited', guests: 4 },
    ],
    comment: 'смешанная бронь',
  });
});

test('encodes and parses late package group start time', () => {
  const startedAt = '2026-07-28T18:30:00.000Z';
  const encoded = encodePackageComment([
    { kind: 'package', hours: 2, guests: 1, startedAt },
  ], 'добавили позже');

  expect(parsePackageComment(encoded)).toEqual({
    groups: [
      { kind: 'package', hours: 2, guests: 1, startedAt },
    ],
    comment: 'добавили позже',
  });
});

test('parses legacy package groups without kind', () => {
  expect(parsePackageComment('[packages][{"hours":2,"guests":3}]')).toEqual({
    groups: [{ kind: 'package', hours: 2, guests: 3 }],
    comment: '',
  });
});

test('calculates package end times and guest total', () => {
  expect(addHoursToClockTime('23:30', 2)).toBe('01:30');
  expect(getPackageGuestsTotal([
    { kind: 'time', guests: 1 },
    { kind: 'package', hours: 2, guests: 3 },
    { kind: 'package', hours: 3, guests: 2 },
    { kind: 'unlimited', guests: 4 },
  ])).toBe(10);
});

test('adds late tariff guests to booking guest count', () => {
  expect(getGuestCountAfterTariffAddition(4, 1)).toBe(5);
  expect(getGuestCountAfterTariffAddition(4, 3)).toBe(7);
  expect(getGuestCountAfterTariffAddition(4, 0)).toBe(4);
});

test('package groups are optional and plain comments stay plain', () => {
  expect(encodePackageComment([], 'обычная бронь')).toBe('обычная бронь');
  expect(parsePackageComment('обычная бронь')).toEqual({ groups: [], comment: 'обычная бронь' });
});

test('builds quick presets for all guests', () => {
  expect(buildPackagePreset('time', 5)).toEqual({ groups: [{ kind: 'time', guests: 5 }], endTime: undefined });
  expect(buildPackagePreset('unlimited', 5)).toEqual({ groups: [{ kind: 'unlimited', guests: 5 }], endTime: '' });
  expect(buildPackagePreset('2h', 5)).toEqual({ groups: [{ kind: 'package', hours: 2, guests: 5 }], endTime: '' });
  expect(buildPackagePreset('3h', 5)).toEqual({ groups: [{ kind: 'package', hours: 3, guests: 5 }], endTime: '' });
});

test('calculates package end from active start, not from booking time', () => {
  expect(getPackageEndDateFromActiveStart('2026-07-28T18:10:00.000Z', 2).toISOString())
    .toBe('2026-07-28T20:10:00.000Z');
});

test('extracts guest counters for edit forms', () => {
  expect(getPackageGroupGuestCounts([
    { kind: 'time', guests: 2 },
    { kind: 'package', hours: 2, guests: 3 },
    { kind: 'package', hours: 3, guests: 1 },
    { kind: 'unlimited', guests: 4 },
  ])).toEqual({
    timeGuests: 2,
    package2Guests: 3,
    package3Guests: 1,
    unlimitedGuests: 4,
  });
});

test('detects package group ending soon from active start', () => {
  const group = { kind: 'package' as const, hours: 2 as const, guests: 3 };
  const now = new Date('2026-07-28T19:51:00.000Z');

  expect(getPackageGroupEndingSoonInfo(
    group,
    '2026-07-28T18:00:00.000Z',
    now,
    10
  )).toEqual({
    endDate: new Date('2026-07-28T20:00:00.000Z'),
    minutesLeft: 9,
    label: '⏳ ПАКЕТ 2 ЧАСА ЗАКАНЧИВАЕТСЯ (9 мин)',
    packageLabel: 'Пакет 2 часа',
  });
});

test('detects late package group ending soon from its own start time', () => {
  const group = {
    kind: 'package' as const,
    hours: 2 as const,
    guests: 1,
    startedAt: '2026-07-28T18:30:00.000Z',
  };

  expect(getPackageGroupEndingSoonInfo(
    group,
    '2026-07-28T18:00:00.000Z',
    new Date('2026-07-28T20:21:00.000Z'),
    10
  )).toEqual({
    endDate: new Date('2026-07-28T20:30:00.000Z'),
    minutesLeft: 9,
    label: '⏳ ПАКЕТ 2 ЧАСА ЗАКАНЧИВАЕТСЯ (9 мин)',
    packageLabel: 'Пакет 2 часа',
  });
});

test('detects package group five minute warning separately', () => {
  const group = { kind: 'package' as const, hours: 2 as const, guests: 3 };

  expect(getPackageGroupEndingSoonInfo(
    group,
    '2026-07-28T18:00:00.000Z',
    new Date('2026-07-28T19:55:00.000Z'),
    5
  )?.minutesLeft).toBe(5);

  expect(getPackageGroupEndingSoonInfo(
    group,
    '2026-07-28T18:00:00.000Z',
    new Date('2026-07-28T19:54:00.000Z'),
    5
  )).toBeNull();
});

test('detects ended package group only inside notification window', () => {
  const group = { kind: 'package' as const, hours: 3 as const, guests: 2 };

  expect(getPackageGroupEndedInfo(
    group,
    '2026-07-28T18:00:00.000Z',
    new Date('2026-07-28T21:03:00.000Z'),
    10
  )).toEqual({
    endDate: new Date('2026-07-28T21:00:00.000Z'),
    minutesOver: 3,
    packageLabel: 'Пакет 3 часа',
  });

  expect(getPackageGroupEndedInfo(
    group,
    '2026-07-28T18:00:00.000Z',
    new Date('2026-07-28T21:11:00.000Z'),
    10
  )).toBeNull();
});

test('formats package timers in real package mode', () => {
  expect(formatPackageRemainingText(61 * 60 * 1000)).toBe('01:01');
  expect(formatPackageRemainingText(8 * 60 * 1000)).toBe('8 мин');
});
