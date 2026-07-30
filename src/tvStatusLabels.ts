export type TvPowerState = boolean | null;
export type TvConnectionState = boolean | null;
export type TvScreenState = {
  appRunning: boolean | null;
  appVisible?: boolean | null;
  appVersion?: string | null;
};

export function getTvPowerLabel(tvOn: TvPowerState): string {
  if (tvOn === null) return '⚪ TV ?';
  return tvOn ? '🟢 TV включен' : '🔴 TV выключен';
}

export function getTvConnectionLabel(appRunning: TvConnectionState): string {
  if (appRunning === null) return '⚪ Связь с приложением: ?';
  return appRunning ? '🟢 Связь с приложением: есть' : '🔴 Связь с приложением: нет';
}

export function getTvScreenLabel({ appRunning, appVisible, appVersion }: TvScreenState): string {
  if (!appRunning) return '🔴 Экран: нет данных';
  if (appVisible === true) return '🟢 Экран: на экране';
  if (appVisible === false) return '🟡 Экран: в фоне';
  return appVersion ? '⚪ Экран: неизвестно' : '⚪ Экран: неизвестно (старый Tizen)';
}
