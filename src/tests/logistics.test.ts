import { describe, it, expect } from 'vitest';
import { createLiveSession } from '../game/live';
import { enterCareer } from '../world/engine';
import { tickLogistics, depotRequests } from '../world/logistics';
const setup = () =>
  enterCareer(
    createLiveSession('stock-test'),
    'operator',
    'logistics',
    'Stock boss',
  );
describe('office logistics', () => {
  it('counts and ships independently in both offices', () => {
    const s = setup();
    s.requests = [];
    for (const elapsed of [20, 40, 60]) {
      s.elapsed = elapsed;
      tickLogistics(s);
    }
    for (const office of ['albion', 'continental'] as const) {
      expect(s.world!.logistics![office].shipped).toBeGreaterThan(0);
      expect(s.world!.logistics![office].units).toBeLessThan(
        office === 'albion' ? 180 : 240,
      );
    }
  });
  it('holds a shipment on an open request and applies each missed shipment once', () => {
    const s = setup();
    s.requests[0].departmentId = 'logistics';
    const r = depotRequests(s, 'albion')[0];
    s.elapsed = 60;
    tickLogistics(s);
    expect(s.world!.logistics!.albion.shipped).toBe(0);
    const before = s.game.metrics.turnover;
    r.status = 'expired';
    s.elapsed = 61;
    tickLogistics(s);
    expect(s.world!.logistics!.albion.lost).toBe(12);
    expect(s.game.metrics.turnover).toBe(before - 60000);
    tickLogistics(s);
    expect(s.game.metrics.turnover).toBe(before - 60000);
  });
  it('stops dispatch when no logistics staff are available', () => {
    const s = setup();
    s.requests = [];
    s.game.employees
      .filter((e) => e.departmentId === 'logistics')
      .forEach((e) => {
        e.status = 'absent';
      });
    s.elapsed = 60;
    tickLogistics(s);
    expect(s.world!.logistics!.albion.shipped).toBe(0);
    expect(s.world!.logistics!.continental.shipped).toBe(0);
  });
  it('cannot recover from zero turnover through a dispatch in the same tick', () => {
    const s = setup();
    s.requests[0].departmentId = 'logistics';
    s.requests[0].status = 'expired';
    s.game.metrics.turnover = 60000;
    s.elapsed = 60;
    tickLogistics(s);
    expect(s.game.status).toBe('finished');
    expect(s.game.metrics.turnover).toBe(0);
    expect(s.paused).toBe(true);
  });
});
