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
    expect(end.world!.cases.every((c) => c.choice)).toBe(true);
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
});
