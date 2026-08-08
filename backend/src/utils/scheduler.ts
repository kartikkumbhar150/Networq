import prisma from '../db/prisma';
import { settleEscrow } from './escrow';

/**
 * On server startup, find all events that ended but haven't been settled yet,
 * and schedule their escrow settlement 1 minute after endDate.
 */
export async function initScheduler(): Promise<void> {
  try {
    const unsettled = await prisma.event.findMany({
      where: { status: { in: ['published', 'ongoing'] } }
    });

    const now = Date.now();
    let scheduled = 0;

    for (const event of unsettled) {
      const endMs = event.endDate.getTime();
      const settleAt = endMs + 60_000; // 1 min after end
      const delay = Math.max(0, settleAt - now);

      setTimeout(async () => {
        console.log(`[scheduler] Settling escrow for event: ${event.title}`);
        await settleEscrow(event.id);
      }, delay);

      scheduled++;
    }

    console.log(`[scheduler] Initialized — ${scheduled} event(s) queued for settlement`);
  } catch (err) {
    console.error('[scheduler] Failed to initialize:', err);
  }
}

/**
 * Schedule a single event's settlement.
 * Call this after a new event is created or started.
 */
export function scheduleSettlement(eventId: string, endDate: Date): void {
  const delay = Math.max(0, endDate.getTime() + 60_000 - Date.now());
  setTimeout(async () => {
    console.log(`[scheduler] Settling escrow for event: ${eventId}`);
    await settleEscrow(eventId);
  }, delay);
}
