export interface TvMediaItem {
  type: 'image' | 'video';
  url: string;
}

export function parseTvMediaItems(value: unknown): TvMediaItem[] {
  if (!Array.isArray(value)) return [];

  return value.filter((item): item is TvMediaItem => {
    if (!item || typeof item !== 'object') return false;
    const candidate = item as Partial<TvMediaItem>;
    return (
      (candidate.type === 'image' || candidate.type === 'video') &&
      typeof candidate.url === 'string' &&
      candidate.url.length > 0
    );
  });
}
