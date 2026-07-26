import { findAntiSleepZone, AntiSleepZone } from './antiSleep';

const zones: AntiSleepZone[] = [
  { branch: 'Полевая', tableId: 42, zoneName: 'Зона 20', enabled: false },
  { branch: 'МСК', tableId: 2, zoneName: 'Зона 2', enabled: true },
  { branch: 'МСК', tableId: 1, zoneName: 'Зона 1', enabled: false },
];

test('finds the exact zone by branch and table id', () => {
  expect(findAntiSleepZone(zones, 'Полевая', 42)).toEqual(zones[0]);
  expect(findAntiSleepZone(zones, 'МСК', 2)).toEqual(zones[1]);
  expect(findAntiSleepZone(zones, 'Полевая', 2)).toBeUndefined();
});
