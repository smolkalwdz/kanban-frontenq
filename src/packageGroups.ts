export interface PackageGroup {
  hours: 2 | 3;
  guests: number;
}

export interface ParsedPackageComment {
  groups: PackageGroup[];
  comment: string;
}

const PACKAGE_PREFIX = '[packages]';

export function isMixedPackageZone(branch: string, tableId: number): boolean {
  return branch === 'Полевая' && Number(tableId) === 42;
}

export function addHoursToClockTime(time: string, hours: number): string {
  const [rawHours, rawMinutes] = time.split(':').map(Number);
  if (!Number.isFinite(rawHours) || !Number.isFinite(rawMinutes)) return '';
  const totalMinutes = (rawHours * 60 + rawMinutes + hours * 60) % (24 * 60);
  const nextHours = Math.floor(totalMinutes / 60);
  const nextMinutes = totalMinutes % 60;
  return `${String(nextHours).padStart(2, '0')}:${String(nextMinutes).padStart(2, '0')}`;
}

export function normalizePackageGroups(groups: PackageGroup[]): PackageGroup[] {
  return groups
    .filter(group => (group.hours === 2 || group.hours === 3) && Number(group.guests) > 0)
    .map(group => ({ hours: group.hours, guests: Number(group.guests) }));
}

export function getPackageGuestsTotal(groups: PackageGroup[]): number {
  return normalizePackageGroups(groups).reduce((sum, group) => sum + group.guests, 0);
}

export function encodePackageComment(groups: PackageGroup[], comment: string): string {
  const normalized = normalizePackageGroups(groups);
  const cleanComment = String(comment || '').trim();
  if (!normalized.length) return cleanComment;
  return `${PACKAGE_PREFIX}${JSON.stringify(normalized)}${cleanComment ? `\n${cleanComment}` : ''}`;
}

export function parsePackageComment(value?: string): ParsedPackageComment {
  const raw = String(value || '');
  if (!raw.startsWith(PACKAGE_PREFIX)) {
    return { groups: [], comment: raw };
  }

  const lineBreakIndex = raw.indexOf('\n');
  const packageLine = lineBreakIndex === -1 ? raw : raw.slice(0, lineBreakIndex);
  const comment = lineBreakIndex === -1 ? '' : raw.slice(lineBreakIndex + 1);
  const json = packageLine.slice(PACKAGE_PREFIX.length);

  try {
    const parsed = JSON.parse(json);
    return {
      groups: normalizePackageGroups(Array.isArray(parsed) ? parsed : []),
      comment,
    };
  } catch {
    return { groups: [], comment: raw };
  }
}
