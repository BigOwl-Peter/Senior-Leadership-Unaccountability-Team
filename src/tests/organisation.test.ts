import { describe, it, expect } from 'vitest';
import { createLiveSession, tickLive } from '../game/live';
import {
  answerCase,
  caseSupportCost,
  businessWeek,
  organisation,
  setTeamPolicy,
  tickOrganisation,
} from '../game/organisation';
import { parseLiveSave } from '../game/liveSave';

describe('team-led company simulation', () => {
  it('quotes varied stable prices, enforces affordability and preserves approved amounts', () => {
    const s = tickLive({ ...createLiveSession('quotes'), paused: false }, 30);
    const item = s.organisation!.cases[0];
    const costs = Array.from({ length: 12 }, (_, topic) =>
      caseSupportCost(s, { ...item, topic }),
    );
    expect(new Set(costs).size).toBeGreaterThan(6);
    expect(costs[6]).toBeLessThanOrEqual(250);
    expect(costs[8]).toBeGreaterThanOrEqual(900);
    expect(costs[4]).toBeGreaterThanOrEqual(5000);
    item.topic = 8;
    const cost = caseSupportCost(s, item);
    expect(caseSupportCost({ ...s, elapsed: 31 }, item)).toBe(cost);
    s.game.company.cash = s.game.company.pendingCosts + cost - 1;
    expect(() => answerCase(s, item.id, 'support')).toThrow('Not enough');
    s.game.company.cash++;
    const approved = answerCase(s, item.id, 'support');
    expect(approved.organisation!.cases[0].supportCost).toBe(cost);
    const restored = parseLiveSave(
      JSON.stringify({ schemaVersion: 2, session: approved, highScores: [] }),
    ).session;
    expect(caseSupportCost(restored, restored.organisation!.cases[0])).toBe(
      cost,
    );
    expect(caseSupportCost(s, { ...item, action: 'support' })).toBe(8000);
  });
  it('healthy teams take ownership without executive micromanagement', () => {
    const s = tickLive({ ...createLiveSession('autonomy'), paused: false }, 30);
    for (const d of s.game.departments) d.workload = 0;
    s.elapsed = 55;
    tickOrganisation(s);
    expect(s.organisation!.cases[0].status).toBe('owned');
    expect(s.organisation!.cases[0].action).toBe('team');
    expect(
      s.messages.some((m) => m.text.includes('no executive sign-off needed')),
    ).toBe(true);
  });
  const firstCase = () =>
    tickLive({ ...createLiveSession('company-test'), paused: false }, 30);
  it('generates employee conversations and named leaders deterministically', () => {
    const s = firstCase();
    expect(s.organisation?.cases).toHaveLength(1);
    const c = s.organisation!.cases[0];
    const employee = s.game.employees.find((e) => e.id === c.employeeId)!;
    expect(
      s.messages.some(
        (m) => m.authorName === `${employee.firstName} ${employee.surname}`,
      ),
    ).toBe(true);
    expect(s).toEqual(firstCase());
  });
  it('funded action resolves while dismissal escalates and cannot be answered twice', () => {
    const initial = firstCase(),
      id = initial.organisation!.cases[0].id;
    const funded = answerCase(initial, id, 'support');
    expect(
      funded.game.company.pendingCosts - initial.game.company.pendingCosts,
    ).toBe(caseSupportCost(initial, initial.organisation!.cases[0]));
    const done = tickLive(funded, 45);
    expect(done.organisation!.cases[0].status).toBe('resolved');
    const ignored = tickLive(answerCase(initial, id, 'dismiss'), 90);
    expect(ignored.organisation!.cases[0].status).toBe('escalated');
    expect(() => answerCase(done, id, 'support')).toThrow();
    expect(initial.organisation!.cases[0].status).toBe('open');
  });
  it('team resolution depends on capacity and trust', () => {
    const s = firstCase(),
      c = s.organisation!.cases[0];
    for (const d of s.game.departments) d.workload = 0;
    const delegated = answerCase(s, c.id, 'team');
    delegated.elapsed = delegated.organisation!.cases[0].due;
    tickOrganisation(delegated);
    expect(delegated.organisation!.cases[0].status).toBe('resolved');
    organisation(s).teams.find((t) => t.id === c.departmentId)!.trust = 10;
    const failed = answerCase(s, c.id, 'team');
    failed.elapsed = failed.organisation!.cases[0].due;
    tickOrganisation(failed);
    expect(failed.organisation!.cases[0].status).toBe('escalated');
  });
  it('limits policy switching and applies meaningful policy tradeoffs', () => {
    const s = createLiveSession('policy');
    const growth = setTeamPolicy(s, 'sales', 'growth');
    expect(() => setTeamPolicy(growth, 'sales', 'quality')).toThrow();
    const quality = setTeamPolicy(s, 'sales', 'quality');
    businessWeek(growth);
    businessWeek(quality);
    expect(growth.game.metrics.turnover).toBeGreaterThan(
      quality.game.metrics.turnover,
    );
    expect(quality.game.company.pendingCosts).toBeGreaterThan(
      growth.game.company.pendingCosts,
    );
    expect(quality.organisation!.defects).toBeLessThan(
      growth.organisation!.defects,
    );
  });
  it('links backlogs, defects and regulation to real financial consequences', () => {
    const s = createLiveSession('pressure'),
      org = organisation(s);
    org.backlog = 150;
    org.defects = 60;
    org.exposure = 90;
    for (const d of s.game.departments) d.workload = d.capacity * 2;
    const before = s.game.company.pendingCosts;
    businessWeek(s);
    expect(org.lostAccounts).toBe(1);
    expect(s.game.company.pendingCosts - before).toBe(75000);
    expect(s.game.metrics.accountability).toBeGreaterThan(25);
  });
  it('survives save/resume, finishes cases and maintains batched tick determinism', () => {
    const start = firstCase();
    const saved = parseLiveSave(
      JSON.stringify({ schemaVersion: 2, session: start, highScores: [] }),
    ).session;
    expect(tickLive(saved, 120)).toEqual(tickLive(start, 120));
    let small = start;
    for (let i = 0; i < 120; i++) small = tickLive(small, 1);
    expect(small).toEqual(tickLive(start, 120));
    const end = tickLive(start, 1170);
    expect(
      end.organisation!.cases.every((c) =>
        ['resolved', 'escalated'].includes(c.status),
      ),
    ).toBe(true);
    expect(() => setTeamPolicy(end, 'sales', 'growth')).toThrow();
    expect(() =>
      parseLiveSave(
        JSON.stringify({ schemaVersion: 2, session: end, highScores: [] }),
      ),
    ).not.toThrow();
  });
});
