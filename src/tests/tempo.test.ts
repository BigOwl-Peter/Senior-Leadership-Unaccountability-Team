import { describe, expect, it } from 'vitest';
import {
  createLiveSession,
  delegateLive,
  requestAssessment,
  respondLive,
  tickLive,
} from '../game/live';
import { decisionSpeedScore, leadershipScore } from '../game/systems';
import { getEvent } from '../data/events';
import { parseLiveSave } from '../game/liveSave';

describe('decision speed scoring', () => {
  it('rewards quick decisions and penalises late decisions independently of choice effects', () => {
    const start = createLiveSession('tempo');
    const request = start.requests[0];
    const choice = getEvent(request.eventId).choices[0].id;
    const fast = respondLive(start, request.id, choice);
    const slow = respondLive(
      { ...start, elapsed: request.deadline - 1 },
      request.id,
      choice,
    );
    expect(decisionSpeedScore(fast.game)).toBe(600);
    expect(decisionSpeedScore(slow.game)).toBeLessThan(0);
    expect(leadershipScore(fast.game)).toBeGreaterThan(
      leadershipScore(slow.game),
    );
    expect(start.game.decisionTempo).toBeUndefined();
    expect(() => respondLive(fast, request.id, choice)).toThrow();
  });
  it('counts delegation once at handoff and gives missed deadlines the full penalty', () => {
    const start = createLiveSession('tempo');
    const delegated = delegateLive(start, start.requests[0].id, 'operations');
    expect(delegated.game.decisionTempo?.count).toBe(1);
    const resolved = tickLive({ ...delegated, paused: false }, 13);
    expect(resolved.game.decisionTempo).toEqual(delegated.game.decisionTempo);
    const missed = tickLive(
      { ...start, paused: false },
      start.requests[0].deadline,
    );
    expect(decisionSpeedScore(missed.game)).toBe(-600);
  });
  it('assessment extensions do not increase speed credit and saves preserve timing', () => {
    const start = createLiveSession('tempo');
    start.elapsed = 10;
    const assessed = requestAssessment(start, start.requests[0].id);
    const choice = getEvent(start.requests[0].eventId).choices[0].id;
    expect(
      decisionSpeedScore(
        respondLive(assessed, start.requests[0].id, choice).game,
      ),
    ).toBe(
      decisionSpeedScore(respondLive(start, start.requests[0].id, choice).game),
    );
    const result = respondLive(assessed, start.requests[0].id, choice);
    const restored = parseLiveSave(
      JSON.stringify({ schemaVersion: 2, session: result, highScores: [] }),
    );
    expect(restored.session.game.decisionTempo).toEqual(
      result.game.decisionTempo,
    );
    expect(leadershipScore(restored.session.game)).toBe(
      leadershipScore(result.game),
    );
  });
});
