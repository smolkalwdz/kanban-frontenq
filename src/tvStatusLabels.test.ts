import {
  getTvConnectionLabel,
  getTvScreenLabel,
  getTvPowerLabel,
} from './tvStatusLabels';

describe('tv status labels', () => {
  test('separates power, connection, and unknown screen for old Tizen builds', () => {
    expect(getTvPowerLabel(true)).toBe('🟢 TV включен');
    expect(getTvConnectionLabel(true)).toBe('🟢 Связь с приложением: есть');
    expect(getTvScreenLabel({ appRunning: true, appVisible: null, appVersion: null })).toBe('⚪ Экран: неизвестно (старый Tizen)');
  });

  test('shows foreground and background only when visibility is reported', () => {
    expect(getTvScreenLabel({ appRunning: true, appVisible: true, appVersion: '0.2.16' })).toBe('🟢 Экран: на экране');
    expect(getTvScreenLabel({ appRunning: true, appVisible: false, appVersion: '0.2.16' })).toBe('🟡 Экран: в фоне');
  });

  test('does not claim screen state when app does not answer', () => {
    expect(getTvScreenLabel({ appRunning: false, appVisible: true, appVersion: '0.2.16' })).toBe('🔴 Экран: нет данных');
  });
});
