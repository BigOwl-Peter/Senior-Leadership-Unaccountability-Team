import { describe, expect, it } from 'vitest';
import { createGame } from '../game/generate';
import { chooseResponse, processTurn, transferEmployee } from '../game/engine';
import { events, getEvent } from '../data/events';
import { applyEffects } from '../game/effects';
import {
  employeeCapacity,
  leadershipScore,
  updateDepartments,
  objectiveMet,
  headcount,
} from '../game/systems';
import { parseSave } from '../game/save';
import type { GameState, SaveData } from '../models/game';
const resolve = (s: GameState, option = 0) =>
  processTurn(
    chooseResponse(
      s,
      s.activeEvents[0].eventId,
      getEvent(s.activeEvents[0].eventId).choices[option].id,
    ),
  );
const run = (seed: string, option = 0) => {
  let s = createGame(seed);
  while (s.status !== 'finished') s = resolve(s, option);
  return s;
};
const save = (s: GameState): SaveData => ({
  schemaVersion: 1,
  gameVersion: '0.1.0',
  currentGame: s,
  settings: { reducedMotion: false },
  highScores: [],
});
describe('phase 2: seeded game model', () => {
  it('generates repeatable complete initial states', () => {
    const a = createGame('fixed-seed');
    expect(a).toEqual(createGame('fixed-seed'));
    expect(a).not.toEqual(createGame('other-seed'));
    expect(a.employees).toHaveLength(61);
    expect(a.employees.filter((e) => e.officeId === 'albion')).toHaveLength(32);
    expect(a.departments).toHaveLength(9);
    expect(a.departments.every((d) => d.capacity > 0)).toBe(true);
    expect(new Set(a.employees.map((e) => e.id)).size).toBe(61);
  });
  it('round-trips versioned saves and rejects broken or unknown saves', () => {
    const s = resolve(createGame('save'));
    expect(parseSave(JSON.stringify(save(s))).currentGame).toEqual(s);
    expect(() => parseSave('{broken')).toThrow();
    expect(() =>
      parseSave(JSON.stringify({ ...save(s), schemaVersion: 2 })),
    ).toThrow();
    const corrupt = save(s);
    corrupt.currentGame.departments[0].id = 'service';
    expect(() => parseSave(JSON.stringify(corrupt))).toThrow();
  });
});
describe('phase 3: deterministic simulation', () => {
  it('transfers once per week with cost and disruption, without mutating input', () => {
    const initial = createGame('transfer');
    const before = structuredClone(initial);
    const moved = transferEmployee(initial, initial.employees[0].id);
    expect(initial).toEqual(before);
    expect(headcount(moved, 'albion')).toBe(31);
    expect(headcount(moved, 'continental')).toBe(30);
    expect(moved.company.pendingCosts).toBe(5000);
    expect(moved.employees[0].morale).toBe(initial.employees[0].morale - 4);
    expect(moved.metrics.morale).toBeLessThan(initial.metrics.morale);
    expect(() => transferEmployee(moved, moved.employees[1].id)).toThrow();
    expect(() => transferEmployee(initial, 'missing')).toThrow();
    expect(resolve(moved).managementActionUsed).toBe(false);
  });
  it('office mandate is attainable through the available weekly actions', () => {
    let state = createGame('office-mandate');
    const mandate = state.boardObjectives.find((o) => o.metric === 'office')!;
    for (let week = 0; week < 5; week++) {
      const employee = state.employees.find(
        (e) => e.officeId !== mandate.officeId,
      )!;
      state = resolve(transferEmployee(state, employee.id));
    }
    expect(objectiveMet(state, mandate)).toBe(true);
    expect(headcount(state)).toBe(61);
  });
  it('distributes departmental work across employee effective capacity', () => {
    const state = createGame('workload-allocation');
    for (const department of state.departments) {
      const total = state.employees
        .filter((e) => e.departmentId === department.id)
        .reduce((sum, e) => sum + e.workload, 0);
      expect(total).toBeCloseTo(department.workload);
    }
  });
  it('completes exactly 20 weekly resolutions and freezes the final state', () => {
    const a = run('twenty');
    expect(a).toEqual(run('twenty'));
    expect(a.turn).toBe(20);
    expect(a.history).toHaveLength(21);
    expect(a.eventHistory.filter((e) => e.type === 'resolution')).toHaveLength(
      20,
    );
    expect(processTurn(a)).toBe(a);
    expect(() => chooseResponse(a, 'customs', 'proper')).toThrow();
  });
  it('does not mutate command inputs and blocks skipped or duplicate decisions', () => {
    const s = createGame('immutable');
    const before = structuredClone(s);
    expect(() => processTurn(s)).toThrow();
    const e = getEvent(s.activeEvents[0].eventId);
    const decided = chooseResponse(s, e.id, e.choices[0].id);
    expect(s).toEqual(before);
    const snapshot = structuredClone(decided);
    processTurn(decided);
    expect(decided).toEqual(snapshot);
    expect(() => chooseResponse(decided, e.id, e.choices[0].id)).toThrow();
  });
  it('overload increases stress, lowers morale, and harms service', () => {
    const s = createGame('overload');
    const overloaded = structuredClone(s);
    overloaded.departments.forEach((d) => {
      d.workload = d.capacity * 2;
    });
    const normal = resolve(s);
    const heavy = resolve(overloaded);
    expect(heavy.metrics.morale).toBeLessThan(normal.metrics.morale);
    expect(heavy.employees[0].stress).toBeGreaterThan(
      normal.employees[0].stress,
    );
    expect(heavy.metrics.customerSatisfaction).toBeLessThan(
      normal.metrics.customerSatisfaction,
    );
    expect(heavy.metrics.turnover).toBeLessThan(normal.metrics.turnover);
  });
  it('capacity responds to competence, morale, stress, traits and employment status', () => {
    const e = createGame('capacity').employees[0];
    expect(employeeCapacity({ ...e, competence: 100 })).toBeGreaterThan(
      employeeCapacity({ ...e, competence: 0 }),
    );
    expect(employeeCapacity({ ...e, morale: 100 })).toBeGreaterThan(
      employeeCapacity({ ...e, morale: 0 }),
    );
    expect(employeeCapacity({ ...e, stress: 100 })).toBeLessThan(
      employeeCapacity({ ...e, stress: 0 }),
    );
    expect(employeeCapacity({ ...e, status: 'absent' })).toBe(0);
    expect(
      employeeCapacity({ ...e, traits: ['Spreadsheet Wizard'] }),
    ).toBeGreaterThan(
      employeeCapacity({ ...e, traits: ['Chronic Meeting Organiser'] }),
    );
  });
  it('calculates weekly profit in weekly units and clears one-off costs', () => {
    const s = createGame('finance');
    applyEffects(s, [{ type: 'COST', amount: 50000 }]);
    const next = resolve(s);
    const f = next.financials;
    expect(f.revenue).toBeCloseTo(next.metrics.turnover / 52);
    expect(f.profit).toBeCloseTo(
      f.revenue -
        f.payroll -
        f.shipping -
        f.productCosts -
        f.operating -
        f.decisions,
    );
    expect(next.company.cash).toBeCloseTo(s.company.cash + f.profit);
    expect(next.company.pendingCosts).toBe(0);
    expect(f.decisions).toBeGreaterThanOrEqual(50000);
  });
  it('executes delayed effects once at the specified week', () => {
    let s = createGame('delay');
    s.delayedEffects.push({
      dueTurn: 2,
      title: 'Scheduled charge',
      effects: [{ type: 'COST', amount: 12345 }],
    });
    s = resolve(s);
    expect(s.eventHistory.some((e) => e.title === 'Scheduled charge')).toBe(
      false,
    );
    s = resolve(s);
    expect(
      s.eventHistory.filter((e) => e.title === 'Scheduled charge'),
    ).toHaveLength(1);
    s = resolve(s);
    expect(
      s.eventHistory.filter((e) => e.title === 'Scheduled charge'),
    ).toHaveLength(1);
  });
  it('resumes with identical future random outcomes after serialisation', () => {
    let s = createGame('resume');
    for (let i = 0; i < 7; i++) s = resolve(s);
    let restored = parseSave(JSON.stringify(save(s))).currentGame;
    while (s.status !== 'finished') {
      s = resolve(s);
      restored = resolve(restored);
    }
    expect(restored).toEqual(s);
  });
  it('profit awards no direct leadership points', () => {
    const s = run('score');
    const score = leadershipScore(s);
    s.metrics.profit = -1e9;
    s.company.cash = -1e9;
    expect(leadershipScore(s)).toBe(score);
  });
  it('clamps effects, handles zero capacity and rejects invalid departments', () => {
    const s = createGame('bounds');
    applyEffects(s, [
      { type: 'ACCOUNTABILITY', amount: 1000 },
      { type: 'CUSTOMER_SATISFACTION', amount: -1000 },
    ]);
    expect(s.metrics.accountability).toBe(100);
    expect(s.metrics.customerSatisfaction).toBe(0);
    s.employees.forEach((e) => {
      e.status = 'absent';
    });
    updateDepartments(s);
    expect(
      s.departments.every(
        (d) => d.capacity === 0 && Number.isFinite(d.performance),
      ),
    ).toBe(true);
  });
  it('keeps every strategy finite and in range over multiple seeds', () => {
    for (let i = 0; i < 15; i++)
      for (let option = 0; option < 3; option++) {
        const s = run(`soak-${i}`, option);
        for (const snapshot of s.history) {
          expect(Object.values(snapshot).every(Number.isFinite)).toBe(true);
          for (const key of [
            'accountability',
            'executiveApproval',
            'customerSatisfaction',
            'morale',
            'complianceRisk',
            'operationalHealth',
          ] as const)
            expect(snapshot[key]).toBeGreaterThanOrEqual(0);
        }
        expect(leadershipScore(s)).toBeLessThanOrEqual(6000);
      }
  });
  it('each scenario and response is executable', () => {
    for (const event of events)
      for (const choice of event.choices) {
        const s = createGame('deck');
        s.activeEvents = [{ eventId: event.id, turn: 1 }];
        expect(processTurn(chooseResponse(s, event.id, choice.id)).turn).toBe(
          2,
        );
      }
  });
});
