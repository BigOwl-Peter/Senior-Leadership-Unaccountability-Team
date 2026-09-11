import type { LiveSession } from '../models/live';

// Keep the simulation's 20-week timeline identical at either appointment length.
export const sessionRate = (session: Pick<LiveSession, 'durationMinutes'>) =>
  20 / (session.durationMinutes ?? 20);

export const realSeconds = (session: LiveSession, seconds: number) =>
  Math.ceil(Math.max(0, seconds) / (sessionRate(session) * session.speed));

export function startShift(session: LiveSession, durationMinutes: 10 | 20) {
  if (session.elapsed !== 0 || session.game.status === 'finished')
    return session;
  return { ...session, durationMinutes, speed: 1 as const, paused: false };
}
