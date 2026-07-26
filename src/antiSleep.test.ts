import { groupAntiSleepZones, updateAntiSleepZone, AntiSleepZone } from './antiSleep';

const zones: AntiSleepZone[] = [
  { branch: 'Полевая', tableId: 42, zoneName: 'Зона 20', enabled: false },
  { branch: 'МСК', tableId: 2, zoneName: 'Зона 2', enabled: true },
  { branch: 'МСК', tableId: 1, zoneName: 'Зона 1', enabled: false },
];

test('groups zones by branch while preserving backend order', () => {
  expect(groupAntiSleepZones(zones)).toEqual({
    'МСК': [zones[1], zones[2]],
    'Полевая': [zones[0]],
  });
});

test('updates only the matching branch and table id', () => {
  expect(updateAntiSleepZone(zones, {
    branch: 'Полевая',
    tableId: 42,
    zoneName: 'Зона 20',
    enabled: true,
  })).toEqual([
    { branch: 'Полевая', tableId: 42, zoneName: 'Зона 20', enabled: true },
    zones[1],
    zones[2],
  ]);
});
