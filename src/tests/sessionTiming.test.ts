import { describe, expect, it } from 'vitest';
import { createLiveSession, tickLive } from '../game/live';
import { realSeconds, sessionRate, startShift } from '../game/sessionTiming';
import { parseLiveSave } from '../game/liveSave';

describe('appointment length', () => {
  for (const minutes of [10, 20] as const) {
    it(`finishes all 20 weeks in ${minutes} minutes`, () => {
      const session = startShift(createLiveSession('duration'), minutes);
      expect(realSeconds(session, 1200)).toBe(minutes * 60);
      const end = tickLive(session, minutes * 60 * sessionRate(session));
      expect(end.game.status).toBe('finished');
      expect(end.game.history).toHaveLength(21);
      expect(end.game.turn).toBe(20);
      expect(
        parseLiveSave(
          JSON.stringify({ schemaVersion: 2, session: end, highScores: [] }),
        ).session.durationMinutes,
      ).toBe(minutes);
      expect(startShift(end, minutes)).toBe(end);
    });
  }
  it('defaults legacy saves to 20 minutes and refuses changes mid-shift', () => {
    const session = createLiveSession('legacy');
    delete session.durationMinutes;
    const restored = parseLiveSave(
      JSON.stringify({ schemaVersion: 2, session, highScores: [] }),
    ).session;
    expect(restored.durationMinutes).toBe(20);
    const running = tickLive(startShift(session, 10), 4);
    expect(startShift(running, 20)).toBe(running);
    expect(realSeconds({ ...running, speed: 2 }, 60)).toBe(15);
  });
});
