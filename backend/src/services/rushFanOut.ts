import { eq, inArray } from 'drizzle-orm';
import * as schema from '../db/schema/schema.js';
import type { App } from '../index.js';
import { sendExpoPushNotification } from '../utils/pushNotification.js';

type AvailabilityWindow = { start: string; end: string };
type AvailabilityTemplate = Record<string, AvailabilityWindow[]>;

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function isTimeInWindow(windows: AvailabilityWindow[], shiftTime: string): boolean {
  const shiftMin = timeToMinutes(shiftTime);
  return windows.some(w => {
    const start = timeToMinutes(w.start);
    const end = timeToMinutes(w.end);
    // overnight window: end < start means crosses midnight
    return end >= start
      ? shiftMin >= start && shiftMin <= end
      : shiftMin >= start || shiftMin <= end;
  });
}

export function workerIsEligibleForShift(
  worker: { availableNowUntil: Date | null; availabilityTemplate: unknown },
  shiftDateTime: Date,
  shiftStartTime: string,
  now: Date,
): { eligible: boolean; via: 'available_now' | 'template' | 'none' } {
  const template = (worker.availabilityTemplate ?? {}) as AvailabilityTemplate;
  const dayKey = DAY_KEYS[shiftDateTime.getDay()];
  const dayWindows = template[dayKey] ?? [];

  const isAvailableNow =
    worker.availableNowUntil != null &&
    worker.availableNowUntil > now &&
    worker.availableNowUntil >= shiftDateTime;

  if (isAvailableNow) return { eligible: true, via: 'available_now' };

  const isInTemplate = dayWindows.length > 0 && isTimeInWindow(dayWindows, shiftStartTime);
  if (isInTemplate) return { eligible: true, via: 'template' };

  return { eligible: false, via: 'none' };
}

export async function fanOutRushShift(app: App, shiftId: string): Promise<number> {
  try {
    const shift = await app.db.query.shifts.findFirst({
      where: eq(schema.shifts.id, shiftId),
    });

    if (!shift) {
      console.error(`[RushFanOut] Shift ${shiftId} not found`);
      return 0;
    }

    const shiftDateTime = new Date(`${shift.date}T${shift.startTime}:00`);
    const now = new Date();

    // Workers whose role matches the shift
    const matchingRoles = await app.db.query.workerRoles.findMany({
      where: eq(schema.workerRoles.role, shift.roleNeeded as any),
    });

    if (matchingRoles.length === 0) {
      console.log(`[RushFanOut] Shift ${shiftId} pinged 0 workers (no workers with role ${shift.roleNeeded})`);
      return 0;
    }

    const workerProfileIds = [...new Set(matchingRoles.map(r => r.workerId))];
    const workers = await app.db.query.workerProfiles.findMany({
      where: inArray(schema.workerProfiles.id, workerProfileIds),
    });

    let availableNowCount = 0;
    let templateOnlyCount = 0;
    const eligibleUserIds: string[] = [];

    for (const worker of workers) {
      const { eligible, via } = workerIsEligibleForShift(worker, shiftDateTime, shift.startTime, now);
      if (eligible) {
        eligibleUserIds.push(worker.userId);
        if (via === 'available_now') availableNowCount++;
        else templateOnlyCount++;
      }
    }

    if (eligibleUserIds.length === 0) {
      console.log(`[RushFanOut] Shift ${shiftId} pinged 0 workers (none have active availability)`);
      return 0;
    }

    const tokens = await app.db.query.pushTokens.findMany({
      where: inArray(schema.pushTokens.userId, eligibleUserIds),
    });

    const workerCount = eligibleUserIds.length;

    if (tokens.length === 0) {
      console.log(`[RushFanOut] Shift ${shiftId} pinged ${workerCount} workers (available_now: ${availableNowCount}, template_only: ${templateOnlyCount}) — 0 push tokens registered`);
      return workerCount;
    }

    const minutesUntil = Math.round((shiftDateTime.getTime() - now.getTime()) / 60000);
    const relTime = minutesUntil < 60 ? `${minutesUntil}min` : `${Math.round(minutesUntil / 60)}h`;
    const title = `🔥 Rush shift — $${Math.round(shift.hourlyPayCents / 100)}/hr`;
    const body = `${shift.roleNeeded} at ${shift.location}, starts in ${relTime}. Tap to claim.`;
    const data = { type: 'rush_shift', shift_id: shiftId };

    // Fire push sends as fire-and-forget — do not block the caller
    const pushBatch = async () => {
      const BATCH = 100;
      for (let i = 0; i < tokens.length; i += BATCH) {
        await Promise.all(
          tokens.slice(i, i + BATCH).map(t =>
            sendExpoPushNotification(t.expoPushToken, title, body, data),
          ),
        );
      }
    };
    pushBatch().catch(err =>
      console.error(`[RushFanOut] Push send error for shift ${shiftId}:`, err),
    );

    console.log(`[RushFanOut] Shift ${shiftId} pinged ${workerCount} workers (available_now: ${availableNowCount}, template_only: ${templateOnlyCount})`);
    return workerCount;
  } catch (err) {
    console.error(`[RushFanOut] Unexpected error for shift ${shiftId}:`, err);
    return 0;
  }
}
