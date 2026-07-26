export interface AntiSleepZone {
  branch: 'МСК' | 'Полевая';
  tableId: number;
  zoneName: string;
  enabled: boolean;
}

export function findAntiSleepZone(
  zones: AntiSleepZone[],
  branch: AntiSleepZone['branch'],
  tableId: number
): AntiSleepZone | undefined {
  return zones.find(zone =>
    zone.branch === branch && zone.tableId === tableId
  );
}
