# TV Video Slides Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add MP4 files to the TV slideshow so images display for 7 seconds and videos play for their full duration in one cyclic upload-order playlist.

**Architecture:** Keep `GET /api/tv/slides` image-only for old TV builds and add a typed `GET /api/tv/media` endpoint for the new build. The admin panel consumes the typed endpoint. The Tizen app uses a small testable playlist-policy module and switches between the existing image element and a new video element.

**Tech Stack:** Node.js/Express/Multer backend, React/TypeScript admin panel, ES5-compatible Tizen Web application, Node test runner, Jest.

## Global Constraints

- Images: JPG, JPEG, PNG and WEBP; 15 MB maximum each.
- Videos: MP4 only; 100 MB maximum each.
- Do not force `muted`; uploaded videos already have no audio track.
- Images display for exactly 7 seconds; videos advance only on `ended`.
- Preserve the image-only endpoint until every TV has been updated.
- One upload-order cyclic playlist; no manual reordering.
- HDMI always interrupts and hides slideshow media.

---

### Task 1: Backend media catalogue and validation

**Files:**
- Create: `C:/Users/smolk/Videos/tv/_backups/kanban-backend-20260721/tvMedia.js`
- Create: `C:/Users/smolk/Videos/tv/_backups/kanban-backend-20260721/tvMedia.test.js`
- Modify: `C:/Users/smolk/Videos/tv/_backups/kanban-backend-20260721/server.js`

**Interfaces:**
- Produces: `classifyMediaFilename(filename): 'image' | 'video' | null`
- Produces: `buildMediaPlaylist(files, publicBaseUrl): Array<{type, url}>`
- Produces: `validateMediaFile(file): {valid, error?}`
- Produces: `GET /api/tv/media`
- Preserves: `GET /api/tv/slides` as image URL strings

- [ ] **Step 1: Write failing classification, ordering and size tests**

```js
test('classifies supported TV media', () => {
  assert.equal(classifyMediaFilename('one.JPG'), 'image');
  assert.equal(classifyMediaFilename('clip.mp4'), 'video');
  assert.equal(classifyMediaFilename('clip.webm'), null);
});

test('builds a sorted encoded typed playlist', () => {
  assert.deepEqual(buildMediaPlaylist(
    ['200_video.mp4', '100_картинка.jpg', 'ignored.txt'],
    'https://example.test/slides'
  ), [
    { type: 'image', url: 'https://example.test/slides/100_%D0%BA%D0%B0%D1%80%D1%82%D0%B8%D0%BD%D0%BA%D0%B0.jpg' },
    { type: 'video', url: 'https://example.test/slides/200_video.mp4' },
  ]);
});
```

- [ ] **Step 2: Run `node --test tvMedia.test.js` and verify missing exports fail**
- [ ] **Step 3: Implement classification, upload-time sorting, URL encoding and per-type size validation**
- [ ] **Step 4: Add `GET /api/tv/media`; keep `/api/tv/slides` image-only**
- [ ] **Step 5: Accept image MIME types and `video/mp4`, use a 100 MB Multer ceiling, and reject/remove images larger than 15 MB**
- [ ] **Step 6: Return explicit JSON errors for failed upload and deletion**
- [ ] **Step 7: Run `node --test tvMedia.test.js` and `node --check server.js`**
- [ ] **Step 8: Back up live files, deploy, restart only `kanban-backend`, and verify both GET endpoints**

### Task 2: Admin mixed-media interface

**Files:**
- Create: `C:/Users/smolk/Videos/tv/_worktrees/anti-sleep-prod/src/tvMedia.ts`
- Create: `C:/Users/smolk/Videos/tv/_worktrees/anti-sleep-prod/src/tvMedia.test.ts`
- Modify: `C:/Users/smolk/Videos/tv/_worktrees/anti-sleep-prod/src/AdminPanel.tsx`

**Interfaces:**
- Produces: `TvMediaItem { type: 'image' | 'video'; url: string }`
- Produces: `parseTvMediaItems(value): TvMediaItem[]`
- Consumes: `GET /api/tv/media`

- [ ] **Step 1: Write a failing parser test**

```ts
expect(parseTvMediaItems([
  { type: 'image', url: 'https://example.test/a.jpg' },
  { type: 'video', url: 'https://example.test/b.mp4' },
  { type: 'audio', url: 'https://example.test/c.mp3' },
])).toEqual([
  { type: 'image', url: 'https://example.test/a.jpg' },
  { type: 'video', url: 'https://example.test/b.mp4' },
]);
```

- [ ] **Step 2: Run `CI=true npm test -- --watchAll=false src/tvMedia.test.ts` and verify failure**
- [ ] **Step 3: Implement the typed parser**
- [ ] **Step 4: Request `/api/tv/media`, accept images and MP4, and check `response.ok`**
- [ ] **Step 5: Render images with `<img>` and videos with `<video controls preload="metadata">`**
- [ ] **Step 6: Show upload/delete errors and the combined item count**
- [ ] **Step 7: Run the focused Jest test and `npm run build`**
- [ ] **Step 8: Commit and push only frontend media changes to `main`**

### Task 3: Testable Tizen playlist policy

**Files:**
- Create: `C:/Users/smolk/Videos/tv/mediaPlaylist.js`
- Create: `C:/Users/smolk/Videos/tv/mediaPlaylist.test.js`

**Interfaces:**
- Produces: `getAdvancePolicy(item, imageDurationMs)`
- Produces: `getNextMediaIndex(currentIndex, itemCount)`

- [ ] **Step 1: Write failing Node tests**

```js
test('images advance by timer and videos by ended', () => {
  assert.deepEqual(getAdvancePolicy({ type: 'image' }, 7000), { event: 'timer', delayMs: 7000 });
  assert.deepEqual(getAdvancePolicy({ type: 'video' }, 7000), { event: 'ended' });
});

test('playlist wraps to the first item', () => {
  assert.equal(getNextMediaIndex(3, 4), 0);
});
```

- [ ] **Step 2: Run `node --test mediaPlaylist.test.js` and verify missing functions fail**
- [ ] **Step 3: Implement an ES5 browser global plus CommonJS export**
- [ ] **Step 4: Run the tests and verify they pass**

### Task 4: Tizen mixed-media playback

**Files:**
- Modify: `C:/Users/smolk/Videos/tv/index.html`
- Modify: `C:/Users/smolk/Videos/tv/css/style.css`
- Modify: `C:/Users/smolk/Videos/tv/main.js`
- Modify: `C:/Users/smolk/Videos/tv/config.xml`

**Interfaces:**
- Consumes: `GET /api/tv/media`
- Consumes: global `TvMediaPlaylist`

- [ ] **Step 1: Load `mediaPlaylist.js` before `main.js` and add `<video id="slideshow-video">` without `muted`**
- [ ] **Step 2: Style image and video to fill 1920×1080 with `object-fit: contain`**
- [ ] **Step 3: Replace `slideUrls` with typed `mediaItems`; clear it when the API returns an empty array**
- [ ] **Step 4: Images schedule the next item after 7000 ms**
- [ ] **Step 5: Videos call `play()` and advance only on `ended`; media errors skip the item**
- [ ] **Step 6: HDMI clears image timers, pauses video, removes its source and hides the slideshow**
- [ ] **Step 7: HDMI loss starts from item zero and notification overlays remain above media**
- [ ] **Step 8: Increment widget version/build stamp; run syntax checks and playlist tests**

### Task 5: Packaging and one-TV pilot

**Files:**
- Generated: `C:/Users/smolk/Videos/tv/test.wgt`

**Interfaces:**
- Consumes: `node deploy.js <TV_IP>`

- [ ] **Step 1: Build the WGT without launching and verify it contains the updated media files**
- [ ] **Step 2: Determine or ask for the pilot TV IP**
- [ ] **Step 3: Install and launch only on the selected pilot television**
- [ ] **Step 4: Verify image → full MP4 → image, HDMI interruption and playlist restart**
- [ ] **Step 5: Report pilot results before updating other televisions**
