import { describe, expect, it } from 'vitest';
import {
  createLiveSession,
  delegateLive,
  requestAssessment,
  respondLive,
  SESSION_SECONDS,
  tickLive,
} from '../game/live';
import { conversations } from '../data/teams';
import { parseLiveSave } from '../game/liveSave';
import { getEvent } from '../data/events';
const running = (seed = 'live-test') => ({
  ...createLiveSession(seed),
  paused: false,
});
describe('real-time leadership simulation', () => {
  it('creates reproducible requests and preserves input on clock steps', () => {
    const input = running();
    const before = structuredClone(input);
    expect(tickLive(input, 100)).toEqual(tickLive(running(), 100));
    expect(input).toEqual(before);
    expect(tickLive(input, 100)).not.toEqual(tickLive(running('other'), 100));
  });
  it('pause freezes the entire company and a batched clock matches individual ticks', () => {
    const paused = createLiveSession();
    expect(tickLive(paused, 100)).toBe(paused);
    let singles = running();
    for (let i = 0; i < 120; i++) singles = tickLive(singles);
    expect(singles).toEqual(tickLive(running(), 120));
  });
  it('overlaps approvals, sends objections, and progresses without player input', () => {
    const state = tickLive(running(), 30);
    expect(
      state.requests.filter((r) => r.status === 'pending').length,
    ).toBeGreaterThan(1);
    expect(
      state.messages.some(
        (m) => m.author === 'operations' && m.requestId === 'request-0',
      ),
    ).toBe(true);
    expect(state.messages.some((m) => m.kind === 'autonomous')).toBe(true);
    expect(tickLive(state, 30).game.turn).toBe(2);
  });
  it('runs the advertised fallback exactly at the deadline, only once', () => {
    const initial = running();
    const request = initial.requests[0];
    const before = tickLive(initial, request.deadline - 1);
    expect(before.requests[0].status).toBe('pending');
    const after = tickLive(before);
    expect(after.requests[0].status).toBe('expired');
    expect(after.requests[0].choiceId).toBe(
      conversations[request.eventId].defaultChoice,
    );
    expect(() => respondLive(after, request.id, 'accept')).toThrow();
    expect(
      tickLive(after, 5).messages.filter(
        (m) => m.requestId === request.id && m.kind === 'decision',
      ),
    ).toHaveLength(1);
  });
  it('approval prevents fallback and records the chosen team action', () => {
    const input = running();
    const request = input.requests[0];
    const approved = respondLive(input, request.id, 'phase');
    expect(input.requests[0].status).toBe('pending');
    const result = tickLive(approved, request.deadline);
    expect(result.requests[0].status).toBe('resolved');
    expect(result.requests[0].choiceId).toBe('phase');
    expect(
      result.messages.some((m) => m.author === 'you' && m.kind === 'decision'),
    ).toBe(true);
    expect(() => respondLive(approved, request.id, 'phase')).toThrow();
  });
  it('delegated work costs capacity and returns a decision after twelve seconds', () => {
    const state = delegateLive(running(), 'request-0', 'compliance');
    expect(state.requests[0].status).toBe('delegated');
    expect(state.game.metrics.accountability).toBe(20);
    expect(tickLive(state, 11).requests[0].status).toBe('delegated');
    const resolved = tickLive(state, 12);
    expect(resolved.requests[0].status).toBe('resolved');
    expect(
      resolved.messages.some(
        (m) => m.kind === 'decision' && m.author === 'compliance',
      ),
    ).toBe(true);
    expect(() => delegateLive(state, 'request-0', 'finance')).toThrow();
  });
  it('departments use their own priorities when given decision authority', () => {
    const sales = tickLive(delegateLive(running(), 'request-0', 'sales'), 12);
    const operations = tickLive(
      delegateLive(running(), 'request-0', 'operations'),
      12,
    );
    expect(sales.requests[0].choiceId).toBe('accept');
    expect(operations.requests[0].choiceId).toBe('phase');
  });
  it('impact assessment extends a deadline once and consumes staff time', () => {
    const state = running();
    const held = requestAssessment(state, 'request-0');
    expect(held.requests[0].deadline).toBe(state.requests[0].deadline + 15);
    expect(held.game.metrics.executiveApproval).toBe(
      state.game.metrics.executiveApproval - 1,
    );
    expect(() => requestAssessment(held, 'request-0')).toThrow();
  });
  it('restores live deadlines and future outcomes without wall-clock dependence', () => {
    const state = tickLive(delegateLive(running(), 'request-0', 'finance'), 8);
    const restored = parseLiveSave(
      JSON.stringify({ schemaVersion: 2, session: state, highScores: [] }),
    ).session;
    expect(restored).toEqual(state);
    expect(tickLive(restored, 300)).toEqual(tickLive(state, 300));
    restored.requests[0].resolveAt = undefined;
    expect(() =>
      parseLiveSave(
        JSON.stringify({ schemaVersion: 2, session: restored, highScores: [] }),
      ),
    ).toThrow();
  });
  it('finishes twenty automatic weeks, settles all requests, and freezes', () => {
    const end = tickLive(running(), SESSION_SECONDS);
    expect(end.game.status).toBe('finished');
    expect(end.game.history).toHaveLength(21);
    expect(end.elapsed).toBe(SESSION_SECONDS);
    expect(end.paused).toBe(true);
    expect(
      end.requests.every((r) => ['resolved', 'expired'].includes(r.status)),
    ).toBe(true);
    expect(tickLive(end, 10)).toBe(end);
    expect(
      parseLiveSave(
        JSON.stringify({ schemaVersion: 2, session: end, highScores: [] }),
      ).session,
    ).toEqual(end);
  });
  it('all nine teams can initiate and decide on requests across complete sessions', () => {
    const owners = new Set<string>();
    for (let seed = 0; seed < 5; seed++) {
      const state = tickLive(running(`soak-${seed}`), SESSION_SECONDS);
      state.requests.forEach((r) => {
        owners.add(r.departmentId);
        expect(
          getEvent(r.eventId).choices.some((c) => c.id === r.choiceId),
        ).toBe(true);
      });
      expect(Object.values(state.game.metrics).every(Number.isFinite)).toBe(
        true,
      );
    }
    expect(owners.size).toBe(9);
  });
});
