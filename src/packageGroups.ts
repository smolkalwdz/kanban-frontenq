export type TimedPackageGroup = {
  kind: 'time';
  guests: number;
};

export type UnlimitedPackageGroup = {
  kind: 'unlimited';
  guests: number;
};

export type HourlyPackageGroup = {
  kind: 'package';
  hours: 2 | 3;
  guests: number;
  startedAt?: string;
};

export type PackageGroup = TimedPackageGroup | UnlimitedPackageGroup | HourlyPackageGroup;

export interface PackageGroupEndingSoonInfo {
  endDate: Date;
  minutesLeft: number;
  label: string;
  packageLabel: string;
}

export interface PackageGroupEndedInfo {
  endDate: Date;
  minutesOver: number;
  packageLabel: string;
}

export interface ParsedPackageComment {
  groups: PackageGroup[];
  comment: string;
}

export type PackagePreset = 'time' | '2h' | '3h' | 'unlimited';

const PACKAGE_PREFIX = '[packages]';

function normalizeStartedAt(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const date = new Date(value);
  return isNaN(date.getTime()) ? undefined : value;
}

export function isMixedPackageZone(branch: string, tableId: number): boolean {
  return branch === 'Полевая';
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
    .map((group: any) => {
      const guests = Number(group?.guests);
      if (!Number.isFinite(guests) || guests <= 0) return null;

      if (group.kind === 'time') {
        return { kind: 'time', guests } as TimedPackageGroup;
      }

      if (group.kind === 'unlimited') {
        return { kind: 'unlimited', guests } as UnlimitedPackageGroup;
      }

      if (group.kind === 'package' && (group.hours === 2 || group.hours === 3)) {
        const startedAt = normalizeStartedAt(group.startedAt);
        return {
          kind: 'package',
          hours: group.hours,
          guests,
          ...(startedAt ? { startedAt } : {}),
        } as HourlyPackageGroup;
      }

      if (group.kind === undefined && (group.hours === 2 || group.hours === 3)) {
        return { kind: 'package', hours: group.hours, guests } as HourlyPackageGroup;
      }

      return null;
    })
    .filter((group): group is PackageGroup => group !== null);
}

export function getPackageGuestsTotal(groups: PackageGroup[]): number {
  return normalizePackageGroups(groups).reduce((sum, group) => sum + group.guests, 0);
}

export function getGuestCountAfterTariffAddition(currentGuests: number, addedGuests: number): number {
  const current = Math.max(0, Number(currentGuests) || 0);
  const added = Math.max(0, Number(addedGuests) || 0);
  return current + added;
}

export function getGuestCountAfterTariffRemoval(currentGuests: number, removedGroup: PackageGroup): number {
  const current = Math.max(0, Number(currentGuests) || 0);
  const removed = Math.max(0, Number(removedGroup?.guests) || 0);
  return Math.max(1, current - removed);
}

export function removePackageGroupAt(groups: PackageGroup[], index: number): PackageGroup[] {
  return normalizePackageGroups(groups).filter((_, groupIndex) => groupIndex !== index);
}

export function getPackageGroupGuestCounts(groups: PackageGroup[]): {
  timeGuests: number;
  package2Guests: number;
  package3Guests: number;
  unlimitedGuests: number;
} {
  return normalizePackageGroups(groups).reduce(
    (counts, group) => {
      if (group.kind === 'time') counts.timeGuests += group.guests;
      if (group.kind === 'unlimited') counts.unlimitedGuests += group.guests;
      if (group.kind === 'package' && group.hours === 2) counts.package2Guests += group.guests;
      if (group.kind === 'package' && group.hours === 3) counts.package3Guests += group.guests;
      return counts;
    },
    { timeGuests: 0, package2Guests: 0, package3Guests: 0, unlimitedGuests: 0 }
  );
}

export function buildPackagePreset(preset: PackagePreset, guests: number): { groups: PackageGroup[]; endTime?: string } {
  const guestCount = Math.max(0, Number(guests) || 0);
  if (preset === '2h') return { groups: [{ kind: 'package', hours: 2, guests: guestCount }], endTime: '' };
  if (preset === '3h') return { groups: [{ kind: 'package', hours: 3, guests: guestCount }], endTime: '' };
  if (preset === 'unlimited') return { groups: [{ kind: 'unlimited', guests: guestCount }], endTime: '' };
  return { groups: [{ kind: 'time', guests: guestCount }], endTime: undefined };
}

export function getPackageEndDateFromActiveStart(
  activeStartedAt: string,
  hours: 2 | 3
): Date {
  const startedAt = new Date(activeStartedAt);
  const durationMs = hours * 60 * 60 * 1000;
  return new Date(startedAt.getTime() + durationMs);
}

export function getPackageGroupStartAt(
  group: HourlyPackageGroup,
  activeStartedAt: string | null | undefined
): string | null {
  return group.startedAt || activeStartedAt || null;
}

export function getPackageGroupEndDate(
  group: PackageGroup,
  activeStartedAt: string | null | undefined
): Date | null {
  if (group.kind !== 'package') return null;
  const startedAt = getPackageGroupStartAt(group, activeStartedAt);
  if (!startedAt) return null;
  return getPackageEndDateFromActiveStart(startedAt, group.hours);
}

export function getPackageGroupLabel(group: HourlyPackageGroup): string {
  return `Пакет ${group.hours} часа`;
}

export function getPackageGroupEndingSoonInfo(
  group: PackageGroup,
  activeStartedAt: string | null | undefined,
  now: Date,
  warningWindowMinutes = 10
): PackageGroupEndingSoonInfo | null {
  if (group.kind !== 'package') return null;
  const endDate = getPackageGroupEndDate(group, activeStartedAt);
  if (!endDate) return null;
  if (isNaN(endDate.getTime())) return null;

  const diffMs = endDate.getTime() - now.getTime();
  if (diffMs <= 0 || diffMs > warningWindowMinutes * 60 * 1000) return null;

  const minutesLeft = Math.max(1, Math.ceil(diffMs / (60 * 1000)));
  const packageLabel = getPackageGroupLabel(group);
  return {
    endDate,
    minutesLeft,
    label: `⏳ ПАКЕТ ${group.hours} ЧАСА ЗАКАНЧИВАЕТСЯ (${minutesLeft} мин)`,
    packageLabel,
  };
}

export function getPackageGroupEndedInfo(
  group: PackageGroup,
  activeStartedAt: string | null | undefined,
  now: Date,
  notificationWindowMinutes = 10
): PackageGroupEndedInfo | null {
  if (group.kind !== 'package') return null;
  const endDate = getPackageGroupEndDate(group, activeStartedAt);
  if (!endDate) return null;
  if (isNaN(endDate.getTime())) return null;

  const diffMs = endDate.getTime() - now.getTime();
  if (diffMs > 0 || diffMs < -notificationWindowMinutes * 60 * 1000) return null;

  return {
    endDate,
    minutesOver: Math.max(0, Math.floor(Math.abs(diffMs) / (60 * 1000))),
    packageLabel: getPackageGroupLabel(group),
  };
}

export function formatPackageRemainingText(diffMs: number): string {
  if (diffMs <= 0) return 'завершён';

  const totalMinutes = Math.ceil(diffMs / (60 * 1000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0
    ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
    : `${minutes} мин`;
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
