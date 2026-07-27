import {
  VOLUME_READBACK_LOCK_MS,
  createPendingVolumeChange,
  reconcileVolumeReadback,
} from './tvVolumeDisplay';

test('keeps optimistic volume when SmartThings returns stale readback during lock window', () => {
  const pending = createPendingVolumeChange(25, 'up', 1000);

  expect(pending.volume).toBe(26);
  expect(reconcileVolumeReadback(25, pending, 2000)).toBe(26);
});

test('accepts SmartThings readback after the lock window expires', () => {
  const pending = createPendingVolumeChange(25, 'up', 1000);

  expect(reconcileVolumeReadback(25, pending, 1000 + VOLUME_READBACK_LOCK_MS)).toBe(25);
});

test('accepts readback that reaches the optimistic value during lock window', () => {
  const pending = createPendingVolumeChange(25, 'up', 1000);

  expect(reconcileVolumeReadback(26, pending, 2000)).toBe(26);
});
