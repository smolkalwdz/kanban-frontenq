export type VolumeAction = 'up' | 'down';

export interface PendingVolumeChange {
  volume: number;
  lockedUntil: number;
}

export const VOLUME_READBACK_LOCK_MS = 12000;

export function clampVolume(volume: number): number {
  return Math.max(0, Math.min(100, volume));
}

export function createPendingVolumeChange(
  currentVolume: number,
  action: VolumeAction,
  now: number
): PendingVolumeChange {
  const delta = action === 'up' ? 1 : -1;
  return {
    volume: clampVolume(currentVolume + delta),
    lockedUntil: now + VOLUME_READBACK_LOCK_MS,
  };
}

export function reconcileVolumeReadback(
  readbackVolume: number | null,
  pending: PendingVolumeChange | null,
  now: number
): number | null {
  if (readbackVolume === null) return pending ? pending.volume : null;
  if (pending && now < pending.lockedUntil && readbackVolume !== pending.volume) {
    return pending.volume;
  }
  return readbackVolume;
}
