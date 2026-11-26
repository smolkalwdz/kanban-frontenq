# Overdue Booking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show and notify staff about an unactivated booking 30 minutes after its scheduled time.

**Architecture:** A pure React helper calculates a booking's overdue state and drives the card UI. A backend endpoint performs the authoritative check and stores an idempotency timestamp before sending to the existing current-shift Telegram recipients.

**Tech Stack:** React + TypeScript, Jest/CRA tests, Express, JSON data store, Telegram Bot API.

**Spec:** `docs/superpowers/specs/2026-11-26-overdue-booking-design.md`

## Global Constraints

- Threshold: exactly 30 minutes after `booking.time`.
- Only inactive bookings are overdue.
- A booking can notify staff once only.
- Preserve current booking and notification behavior.

## Review Focus

- Invalid or absent `HH:MM` does not mark a card overdue.
- Active cards never alert, even when their time is old.
- Just-before threshold is not overdue; threshold is overdue.
- Old retained records do not trigger a new staff message.
- Two board windows cannot produce duplicate Telegram messages.

### Task 1: Frontend overdue state and card indication

**Files:**
- Create: `src/overdueBooking.ts`
- Create: `src/overdueBooking.test.ts`
- Modify: `src/Board.tsx`
- Modify: `src/App.css`

**Interfaces:**
- Produces `getBookingOverdueInfo(booking, now): { minutesOver: number } | null`.

- [ ] Write tests for invalid time, inactive at 29 minutes, inactive at 30 minutes, and active past threshold.
- [ ] Run the new test and confirm it fails because the helper does not exist.
- [ ] Implement the helper, render the warning, apply the blink class, and poll the notify endpoint every 30 seconds for due cards.
- [ ] Run the focused test and frontend build.

### Task 2: Idempotent server notification

**Files:**
- Modify: `/var/www/kanban-backend/server.js`

**Interfaces:**
- Consumes `{ bookingId }` at `POST /api/telegram/notify-overdue-booking`.
- Produces a skipped or sent JSON result and persists `overdueNotifiedAt`.

- [ ] Add a server-side time/status validation before any send.
- [ ] Persist `overdueNotifiedAt` before send and reuse existing current-shift recipient lookup.
- [ ] Restart only `kanban-backend`; query a harmless invalid request and verify it rejects it.

### Task 3: Deploy and verify

**Files:**
- Modify: built frontend assets on `/var/www/kanban-frontend` (or the active frontend deployment path).

- [ ] Back up changed server/frontend sources.
- [ ] Build frontend, deploy compiled assets, and verify its HTTP response.
- [ ] Confirm endpoint exists and one active/one invalid booking are safely skipped.
