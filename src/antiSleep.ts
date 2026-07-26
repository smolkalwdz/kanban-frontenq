export interface AntiSleepZone {
  branch: 'МСК' | 'Полевая';
  tableId: number;
  zoneName: string;
  enabled: boolean;
}

export function groupAntiSleepZones(zones: AntiSleepZone[]) {
  return {
    'МСК': zones.filter(zone => zone.branch === 'МСК'),
    'Полевая': zones.filter(zone => zone.branch === 'Полевая'),
  };
}

export function updateAntiSleepZone(
  zones: AntiSleepZone[],
  updatedZone: AntiSleepZone
): AntiSleepZone[] {
  return zones.map(zone =>
    zone.branch === updatedZone.branch && zone.tableId === updatedZone.tableId
      ? updatedZone
      : zone
  );
}
