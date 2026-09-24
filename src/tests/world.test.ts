import { describe, expect, it } from 'vitest';
import { createLiveSession, tickLive } from '../game/live';
import { parseLiveSave } from '../game/liveSave';
import { startShift } from '../game/sessionTiming';
import {
  enterCareer,
  resolveWorldCase,
  takeFlight,
  worldChoiceEffects,
} from '../world/engine';
const career = () =>
  enterCareer(
    startShift(createLiveSession('world-test'), 20),
    'operator',
    'operations',
    'Zanele',
  );
describe('corporate world career', () => {
  it('keeps both offices and exposes team/character advantages', () => {
    const s = career();
    expect(s.world!.corruption.albion).not.toBe(
      s.world!.corruption.continental,
    );
    const item = s.world!.cases[0];
    expect(worldChoiceEffects(s, item, 'refuse').corruption).toBe(-18);
    expect(worldChoiceEffects(s, item, 'document').accountability).toBe(-8);
    const next = resolveWorldCase(s, item.id, 'document');
    expect(next.game.metrics.accountability).toBe(7);
    expect(s.game.metrics.accountability).toBe(15);
    expect(() => resolveWorldCase(next, item.id, 'document')).toThrow();
  });
  it('requires a visit for local decisions, but permits remote MD directives', () => {
    const s = tickLive(career(), 60);
    const local = s.world!.cases.find((c) => c.office === 'continental')!;
    expect(() => resolveWorldCase(s, local.id, 'document')).toThrow('visit');
    const md = s.world!.cases.find((c) => c.kind === 'md')!;
    expect(
      resolveWorldCase(s, md.id, 'document').world!.cases.find(
        (c) => c.id === md.id,
      )?.choice,
    ).toBe('document');
  });
  it('flights charge once, leave simulation running and restore correctly', () => {
    const s = career();
    expect(() => takeFlight(s)).toThrow('travel desk');
    s.world!.position = { x: 1056, y: 720 };
    const departing = takeFlight(s);
    expect(
      departing.game.company.pendingCosts - s.game.company.pendingCosts,
    ).toBe(2500);
    expect(() => takeFlight(departing)).toThrow();
    const raw = JSON.stringify({
      schemaVersion: 2,
      session: departing,
      highScores: [],
    });
    const restored = parseLiveSave(raw).session;
    expect(restored).toEqual(departing);
    const arrived = tickLive(restored, 30);
    expect(arrived.world!.office).toBe('continental');
    expect(arrived.world!.flight).toBeUndefined();
    expect(arrived.world!.visits.continental).toBe(1);
  });
  it('expires directives, applies corruption audits and ends a complete appointment', () => {
    const s = career();
    s.world!.corruption.albion = 80;
    const progressed = tickLive(s, 120);
    expect(progressed.world!.cases.find((c) => c.kind === 'md')!.choice).toBe(
      'expired',
    );
    expect(progressed.game.metrics.accountability).toBeGreaterThan(15);
    const end = tickLive(progressed, 1080);
    expect(end.game.status).toBe('finished');
    expect(end.game.metrics.accountability).toBe(100);
    expect(end.elapsed).toBeLessThan(1200);
    expect(
      parseLiveSave(
        JSON.stringify({ schemaVersion: 2, session: end, highScores: [] }),
      ).session,
    ).toEqual(end);
  });
  it('is deterministic when simulation steps are batched', () => {
    let small = career();
    for (let i = 0; i < 200; i++) small = tickLive(small, 1);
    expect(small).toEqual(tickLive(career(), 200));
  });
  it('continues beyond week 20 with events, travel and a reloadable save', () => {
    let s = career();
    // Keep a healthy company to isolate calendar limits from failure rules.
    for (let i = 0; i < 1325; i++) {
      s.game.metrics.accountability = 0;
      s.game.metrics.turnover = 20000000;
      s = tickLive(s);
    }
    expect(s.elapsed).toBe(1325);
    expect(s.game.status).toBe('running');
    expect(s.game.turn).toBe(23);
    expect(s.world!.cases.some((c) => c.opened > 1200)).toBe(true);
    expect(s.requests.some((r) => r.createdAt > 1200)).toBe(true);
    s.world!.position = { x: 1056, y: 720 };
    s = takeFlight(s);
    expect(s.world!.flight!.arrives).toBe(1355);
    expect(
      parseLiveSave(
        JSON.stringify({ schemaVersion: 2, session: s, highScores: [] }),
      ).session,
    ).toEqual(s);
  });
  it('fails on either threshold, but zero accountability is not a timed victory', () => {
    for (const metric of ['accountability', 'turnover'] as const) {
      const s = career();
      s.game.metrics[metric] = metric === 'accountability' ? 100 : 0;
      const ended = tickLive(s, 20);
      expect(ended.game.status).toBe('finished');
      expect(ended.elapsed).toBe(0);
      expect(ended.paused).toBe(true);
    }
    const s = career();
    s.game.metrics.accountability = 0;
    expect(tickLive(s).game.status).toBe('running');
  });
  it('migrates an old time-completed world without deleting the career', () => {
    const s = career();
    delete s.game.continuous;
    s.elapsed = 1200;
    s.game.turn = 20;
    s.game.status = 'finished';
    const restored = parseLiveSave(
      JSON.stringify({ schemaVersion: 2, session: s, highScores: [] }),
    ).session;
    expect(restored.game.status).toBe('running');
    expect(restored.game.turn).toBe(21);
    expect(restored.game.continuous).toBe(true);
    expect(restored.paused).toBe(true);
  });
});
