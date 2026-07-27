import { parseTvMediaItems } from './tvMedia';

test('keeps only valid typed TV media items', () => {
  expect(parseTvMediaItems([
    { type: 'image', url: 'https://example.test/a.jpg' },
    { type: 'video', url: 'https://example.test/b.mp4' },
    { type: 'audio', url: 'https://example.test/c.mp3' },
    { type: 'image', url: '' },
    null,
  ])).toEqual([
    { type: 'image', url: 'https://example.test/a.jpg' },
    { type: 'video', url: 'https://example.test/b.mp4' },
  ]);
});

test('returns an empty list for a malformed response', () => {
  expect(parseTvMediaItems({ items: [] })).toEqual([]);
  expect(parseTvMediaItems(null)).toEqual([]);
});
