import { describe, it, expect } from 'vitest';
import { createGame } from '../game/generate';
import { generateEmployee } from '../game/employees';
import {
  managePersonnel,
  processPersonnel,
  redundancyTerms,
  generateOfficeMandate,
  arriveRecruits,
} from '../game/personnel';
import {
  employeeCapacity,
  headcount,
  objectiveMet,
  teamLeadName,
  updateDepartments,
} from '../game/systems';
import {
  createLiveSession,
  manageLivePersonnel,
  respondLive,
  tickLive,
} from '../game/live';
import { events, getEvent } from '../data/events';
import { conversations } from '../data/teams';
import { parseLiveSave } from '../game/liveSave';
import { choiceUnavailable, eventEligible } from '../game/requirements';
import type { LiveSession } from '../models/live';
function running(seed = 'phase456') {
  return { ...createLiveSession(seed), paused: false };
}
function present(state: LiveSession, eventId: string) {
  state.requests[0].eventId = eventId;
  state.requests[0].departmentId = conversations[eventId].owner;
  return state;
}
describe('phase 4 employee simulation', () => {
  it('generates deterministic employees with varied mechanical traits and skills', () => {
    const employee = generateEmployee('fixed', '1', 'sales', 'albion');
    expect(employee).toEqual(generateEmployee('fixed', '1', 'sales', 'albion'));
    const roster = createGame('variety').employees;
    expect(new Set(roster.flatMap((e) => e.traits)).size).toBeGreaterThan(10);
    expect(
      roster.every((e) => e.traits.length >= 1 && e.traits.length <= 3),
    ).toBe(true);
    expect(employeeCapacity({ ...employee, salesSkill: 100 })).toBeGreaterThan(
      employeeCapacity({ ...employee, salesSkill: 0 }),
    );
  });
  it('promotion increases salary and morale without increasing competence', () => {
    const state = createGame('promotion');
    const e = state.employees[0];
    const changed = managePersonnel(state, {
      type: 'promote',
      employeeId: e.id,
    });
    expect(changed.employees[0].salary).toBe(Math.round(e.salary * 1.2));
    expect(changed.employees[0].capacity).toBeCloseTo(e.capacity * 0.92);
    expect(changed.employees[0].competence).toBe(e.competence);
    expect(changed.employees[0].morale).toBeGreaterThan(e.morale);
    expect(state.employees[0].promotionLevel).toBe(0);
  });
  it('redundancy removes capacity and payroll with severance and political consequences', () => {
    const state = createGame('redundancy');
    const e = state.employees[0];
    e.traits.push('Untouchable');
    updateDepartments(state);
    const capacity = state.departments.find(
      (d) => d.id === e.departmentId,
    )!.capacity;
    const terms = redundancyTerms(e);
    const next = managePersonnel(state, {
      type: 'redundancy',
      employeeId: e.id,
    });
    expect(headcount(next)).toBe(60);
    expect(next.company.pendingCosts).toBe(terms.severance);
    expect(
      next.departments.find((d) => d.id === e.departmentId)!.capacity,
    ).toBeLessThan(capacity);
    expect(next.metrics.accountability).toBeGreaterThan(
      state.metrics.accountability,
    );
    expect(next.employees[0].status).toBe('redundant');
    expect(() =>
      managePersonnel(next, { type: 'redundancy', employeeId: e.id }),
    ).toThrow();
  });
  it('stress causes absence and notices, absence returns, and notice can be retained', () => {
    const state = createGame('lifecycle');
    for (const e of state.employees) {
      e.stress = 100;
      e.morale = 0;
      e.loyalty = 0;
    }
    processPersonnel(state);
    const absent = state.employees.find((e) => e.status === 'absent')!;
    const notice = state.employees.find((e) => e.status === 'notice')!;
    expect(absent).toBeDefined();
    expect(notice).toBeDefined();
    expect(employeeCapacity(absent)).toBe(0);
    const retained = managePersonnel(state, {
      type: 'retain',
      employeeId: notice.id,
    });
    expect(retained.employees.find((e) => e.id === notice.id)!.status).toBe(
      'active',
    );
    expect(
      retained.employees.find((e) => e.id === notice.id)!.departureTurn,
    ).toBeUndefined();
    const returnTurn = absent.returnTurn!;
    state.turn = returnTurn;
    processPersonnel(state);
    expect(absent.status).toBe('active');
    state.turn = notice.departureTurn!;
    processPersonnel(state);
    expect(notice.status).toBe('resigned');
  });
  it('staff actions consume a bounded weekly budget and replace departed leaders', () => {
    let state = running().game;
    const oldLead = teamLeadName(state, 'sales');
    const leader = state.departments.find((d) => d.id === 'sales')!.managerId!;
    state = managePersonnel(state, { type: 'redundancy', employeeId: leader });
    expect(teamLeadName(state, 'sales')).not.toBe(oldLead);
    state = managePersonnel(state, {
      type: 'promote',
      employeeId: state.employees[1].id,
    });
    state = managePersonnel(state, {
      type: 'promote',
      employeeId: state.employees[2].id,
    });
    expect(state.personnelActionsLeft).toBe(0);
    expect(() =>
      managePersonnel(state, {
        type: 'promote',
        employeeId: state.employees[3].id,
      }),
    ).toThrow();
  });
});
describe('phase 5 branching event engine', () => {
  it('has more than twenty standard decisions, valid defaults, and valid follow-up links', () => {
    expect(events.filter((e) => !e.followUpOnly).length).toBeGreaterThanOrEqual(
      20,
    );
    expect(new Set(events.map((e) => e.id)).size).toBe(events.length);
    for (const event of events) {
      const fallback = event.choices.find(
        (c) => c.id === conversations[event.id].defaultChoice,
      )!;
      expect(fallback).toBeDefined();
      expect(fallback.requirements).toBeUndefined();
      for (const c of event.choices)
        for (const link of c.followUps ?? [])
          expect(getEvent(link.eventId).followUpOnly).toBe(true);
    }
  });
  it('does not repeat standard events while unseen eligible content exists', () => {
    let state = running('deck-test');
    for (let i = 0; i < 650; i++) {
      for (const request of state.requests.filter(
        (r) => r.status === 'pending',
      )) {
        const c =
          getEvent(request.eventId).choices.find(
            (c) => !c.followUps?.length && !choiceUnavailable(state.game, c),
          ) ?? getEvent(request.eventId).choices[0];
        state = respondLive(state, request.id, c.id);
      }
      state = tickLive(state);
    }
    const standard = state.requests
      .filter((r) => !getEvent(r.eventId).followUpOnly)
      .slice(0, 20)
      .map((r) => r.eventId);
    expect(new Set(standard).size).toBe(standard.length);
  });
  it('the contract branch creates a linked follow-up; phased rollout avoids it', () => {
    const accepted = respondLive(running(), 'request-0', 'accept');
    expect(accepted.scheduledEvents[0].eventId).toBe('contract-overflow');
    const follow = tickLive(accepted, 45).requests.find(
      (r) => r.eventId === 'contract-overflow',
    );
    expect(follow?.parentRequestId).toBe('request-0');
    expect(
      respondLive(running(), 'request-0', 'phase').scheduledEvents,
    ).toHaveLength(0);
  });
  it('chains continue into a second consequence and remain deterministic across save/resume', () => {
    let state = tickLive(respondLive(running(), 'request-0', 'accept'), 45);
    const child = state.requests.find(
      (r) => r.eventId === 'contract-overflow',
    )!;
    state = respondLive(state, child.id, 'ration');
    const restored = parseLiveSave(
      JSON.stringify({ schemaVersion: 2, session: state, highScores: [] }),
    ).session;
    expect(tickLive(restored, 45)).toEqual(tickLive(state, 45));
    expect(
      tickLive(state, 45).requests.some(
        (r) => r.eventId === 'account-review' && r.parentRequestId === child.id,
      ),
    ).toBe(true);
  });
  it('choice requirements enforce real cash and event triggers reflect company state', () => {
    const state = present(running(), 'consultants');
    state.game.company.cash = 100;
    expect(() => respondLive(state, 'request-0', 'retainer')).toThrow();
    expect(eventEligible(state.game, getEvent('retention'))).toBe(false);
    state.game.employees[0].status = 'notice';
    expect(eventEligible(state.game, getEvent('retention'))).toBe(true);
    state.game.metrics.complianceRisk = 50;
    expect(eventEligible(state.game, getEvent('audit-visit'))).toBe(true);
  });
  it('probabilistic branches are reproducible but vary across seeds', () => {
    const outcomes = new Set<number>();
    for (let i = 0; i < 20; i++) {
      const input = present(running(`prob-${i}`), 'forecast');
      const next = respondLive(input, 'request-0', 'range');
      expect(next).toEqual(respondLive(input, 'request-0', 'range'));
      outcomes.add(next.scheduledEvents.length);
    }
    expect(outcomes.size).toBe(2);
  });
});
describe('phase 6 office management', () => {
  it('recruits arrive at the start of the promised week, once, and then enter payroll', () => {
    const initial = running();
    const candidate = initial.game.candidates.find((c) => c.role === 'junior')!;
    const offered = manageLivePersonnel(initial, {
      type: 'hire',
      candidateId: candidate.id,
      officeId: 'continental',
      departmentId: 'service',
    });
    expect(headcount(offered.game)).toBe(61);
    expect(offered.game.company.pendingCosts).toBe(6000);
    const next = tickLive(offered, 60);
    expect(next.game.turn).toBe(2);
    expect(headcount(next.game)).toBe(62);
    expect(
      next.game.employees.find((e) => e.id === candidate.id)?.officeId,
    ).toBe('continental');
    const count = headcount(next.game);
    arriveRecruits(next.game);
    expect(headcount(next.game)).toBe(count);
    expect(() =>
      manageLivePersonnel(offered, {
        type: 'hire',
        candidateId: candidate.id,
        officeId: 'albion',
        departmentId: 'it',
      }),
    ).toThrow();
    const noHire = tickLive(initial, 120);
    const hire = tickLive(offered, 120);
    expect(hire.game.financials.payroll).toBeGreaterThan(
      noHire.game.financials.payroll,
    );
  });
  it('cancelled offers never join and late offers are rejected', () => {
    let state = createGame('cancel');
    const candidate = state.candidates[0];
    state = managePersonnel(state, {
      type: 'hire',
      candidateId: candidate.id,
      officeId: 'albion',
      departmentId: 'it',
    });
    state = managePersonnel(state, {
      type: 'cancel-hire',
      recruitmentId: state.recruitment[0].id,
    });
    state.turn = 5;
    arriveRecruits(state);
    expect(headcount(state)).toBe(61);
    state.turn = 20;
    expect(() =>
      managePersonnel(state, {
        type: 'hire',
        candidateId: state.candidates[0].id,
        officeId: 'albion',
        departmentId: 'it',
      }),
    ).toThrow();
  });
  it('transfers retain headcount, change office and department capacity, and consume one action', () => {
    const state = createGame('transfer-new');
    const e = state.employees[0];
    const next = managePersonnel(state, {
      type: 'transfer',
      employeeId: e.id,
      officeId: 'continental',
      departmentId: 'it',
    });
    expect(headcount(next)).toBe(61);
    expect(headcount(next, 'continental')).toBe(30);
    expect(next.employees[0].departmentId).toBe('it');
    expect(next.personnelActionsLeft).toBe(2);
    expect(() =>
      managePersonnel(next, {
        type: 'transfer',
        employeeId: e.id,
        officeId: 'continental',
        departmentId: 'it',
      }),
    ).toThrow();
  });
  it('varies mandates and validates consolidation without firing the whole department', () => {
    const rules = new Set<string>();
    for (let i = 0; i < 30; i++)
      rules.add(generateOfficeMandate(createGame(`mandate-${i}`)).officeRule!);
    expect(rules.size).toBe(4);
    const state = createGame('consolidation');
    const mandate = {
      id: 'office',
      label: 'Consolidate',
      metric: 'office' as const,
      officeRule: 'consolidate' as const,
      officeId: 'albion' as const,
      departmentId: 'service' as const,
      target: 5,
    };
    state.employees
      .filter((e) => e.departmentId === 'service')
      .forEach((e) => {
        e.officeId = 'albion';
      });
    expect(objectiveMet(state, mandate)).toBe(true);
    state.employees
      .filter((e) => e.departmentId === 'service')
      .forEach((e) => {
        e.status = 'redundant';
      });
    expect(objectiveMet(state, mandate)).toBe(false);
  });
  it('migrates earlier live saves with defaults without discarding employees or progress', () => {
    const state = running();
    const old = JSON.parse(
      JSON.stringify({ schemaVersion: 2, session: state, highScores: [] }),
    );
    delete old.session.game.personnelActionsLeft;
    delete old.session.game.candidates;
    delete old.session.game.recruitment;
    delete old.session.scheduledEvents;
    const restored = parseLiveSave(JSON.stringify(old)).session;
    expect(restored.game.employees).toEqual(state.game.employees);
    expect(restored.game.personnelActionsLeft).toBe(3);
    expect(restored.scheduledEvents).toEqual([]);
  });
});
