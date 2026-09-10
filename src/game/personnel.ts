import type {
  BoardObjective,
  DepartmentId,
  Employee,
  GameState,
  OfficeId,
} from '../models/game';
import { applyEffects } from './effects';
import {
  clamp,
  employeeCapacity,
  headcount,
  updateDepartments,
} from './systems';
import { generateCandidates } from './employees';
import { randomFor } from './random';
import { departmentDefinitions } from '../data/departments';
export type PersonnelAction =
  | { type: 'promote' | 'redundancy' | 'retain'; employeeId: string }
  | {
      type: 'transfer';
      employeeId: string;
      officeId: OfficeId;
      departmentId: DepartmentId;
    }
  | {
      type: 'hire';
      candidateId: string;
      officeId: OfficeId;
      departmentId: DepartmentId;
    }
  | { type: 'cancel-hire'; recruitmentId: string };
export const employed = (e: Employee) =>
  ['active', 'notice', 'absent'].includes(e.status);
function record(state: GameState, employee: Employee, text: string) {
  employee.history ??= [];
  employee.history.push({ turn: state.turn, text });
  state.eventHistory.push({
    turn: state.turn,
    type: 'personnel',
    title: `${employee.firstName} ${employee.surname}: ${text}`,
    description: `${employee.departmentId} / ${employee.officeId}`,
  });
}
export function redundancyTerms(employee: Employee) {
  return {
    severance: Math.round(employee.salary / 6),
    annualSavings: employee.salary,
    capacityLost: employeeCapacity(employee),
    accountability: Math.round(
      4 +
        employee.politicalInfluence / 5 +
        (employee.traits.includes('Untouchable') ? 20 : 0),
    ),
    risk: employee.protectedStatus?.length ? 15 : 3,
  };
}
function spend(state: GameState, amount: number) {
  if (amount > Math.max(0, state.company.cash - state.company.pendingCosts))
    throw new Error('Insufficient uncommitted cash for this action.');
  applyEffects(state, [{ type: 'COST', amount }]);
}
function refresh(state: GameState) {
  updateDepartments(state);
  const staff = state.employees.filter(employed);
  state.metrics.morale = staff.length
    ? staff.reduce((sum, e) => sum + e.morale, 0) / staff.length
    : 0;
}
export function managePersonnel(
  input: GameState,
  action: PersonnelAction,
): GameState {
  if (input.status !== 'running') throw new Error('The appointment has ended.');
  if (input.personnelActionsLeft <= 0)
    throw new Error('No management actions remain this business week.');
  const state = structuredClone(input);
  if (
    'officeId' in action &&
    !state.offices.some((o) => o.id === action.officeId)
  )
    throw new Error('Unknown office.');
  if (
    'departmentId' in action &&
    !state.departments.some((d) => d.id === action.departmentId)
  )
    throw new Error('Unknown department.');
  if (action.type === 'hire') {
    const candidate = state.candidates.find((c) => c.id === action.candidateId);
    if (!candidate) throw new Error('This candidate is no longer available.');
    if (state.turn + candidate.leadTime > state.maxTurns)
      throw new Error(
        'This candidate cannot arrive before the appointment ends.',
      );
    spend(state, 6000);
    const employee = structuredClone(candidate.employee);
    employee.officeId = action.officeId;
    employee.departmentId = action.departmentId;
    const name = state.departments.find(
      (d) => d.id === action.departmentId,
    )!.name;
    employee.jobTitle =
      candidate.role === 'manager'
        ? `${name} Manager`
        : candidate.role === 'junior'
          ? `Junior ${name} Associate`
          : `${name} Specialist`;
    state.recruitment.push({
      id: `hire-${candidate.id}`,
      employee,
      dueTurn: state.turn + candidate.leadTime,
      status: 'pending',
    });
    record(
      state,
      employee,
      `Offer accepted; joins ${name} in week ${state.turn + candidate.leadTime}.`,
    );
    state.candidates = state.candidates.filter((c) => c.id !== candidate.id);
  } else if (action.type === 'cancel-hire') {
    const hire = state.recruitment.find(
      (r) => r.id === action.recruitmentId && r.status === 'pending',
    );
    if (!hire) throw new Error('This offer can no longer be cancelled.');
    hire.status = 'cancelled';
    record(
      state,
      hire.employee,
      'Offer withdrawn. Recruitment fee is not refundable.',
    );
    applyEffects(state, [{ type: 'ACCOUNTABILITY', amount: 2 }]);
  } else {
    const e = state.employees.find(
      (e) => e.id === action.employeeId && employed(e),
    );
    if (!e) throw new Error('This employee is no longer employed.');
    if (action.type === 'transfer') {
      if (e.status !== 'active')
        throw new Error('Only active employees can move offices or teams.');
      if (
        e.officeId === action.officeId &&
        e.departmentId === action.departmentId
      )
        throw new Error('Choose a different office or department.');
      const movingOffice = e.officeId !== action.officeId;
      spend(state, movingOffice ? 5000 : 1000);
      e.officeId = action.officeId;
      e.departmentId = action.departmentId;
      e.morale = clamp(e.morale - (movingOffice ? 4 : 2));
      e.stress = clamp(e.stress + 8);
      state.managementActionUsed = true;
      applyEffects(state, [{ type: 'ACCOUNTABILITY', amount: 2 }]);
      e.jobTitle = departmentDefinitions.find(
        (d) => d.id === e.departmentId,
      )!.title;
      record(state, e, `Reassigned to ${e.departmentId} in ${e.officeId}.`);
    } else if (action.type === 'promote') {
      if (e.status !== 'active')
        throw new Error('Promotion requires an active employee.');
      if ((e.promotionLevel ?? 0) >= 2)
        throw new Error('This employee has reached the promotion ceiling.');
      spend(state, 1000);
      e.promotionLevel = (e.promotionLevel ?? 0) + 1;
      e.salary = Math.round(e.salary * 1.2);
      e.capacity *= 0.92;
      e.morale = clamp(e.morale + 12);
      e.politicalInfluence = clamp(e.politicalInfluence + 10);
      e.visibility = clamp(e.visibility + 15);
      e.jobTitle =
        e.promotionLevel === 1
          ? `Senior ${e.jobTitle}`
          : `Director of ${e.departmentId} Enablement`;
      record(
        state,
        e,
        'Promoted. Salary +20%; nominal capacity -8% for meetings.',
      );
    } else if (action.type === 'retain') {
      if (e.status !== 'notice')
        throw new Error('No resignation notice to counter.');
      spend(state, 8000);
      e.status = 'active';
      delete e.departureTurn;
      e.salary = Math.round(e.salary * 1.08);
      e.loyalty = clamp(e.loyalty + 20);
      e.morale = clamp(e.morale + 15);
      e.stress = clamp(e.stress - 25);
      record(
        state,
        e,
        'Accepted a retention offer. Salary +8%; notice withdrawn.',
      );
    } else {
      const terms = redundancyTerms(e);
      spend(state, terms.severance);
      e.status = 'redundant';
      e.workload = 0;
      delete e.returnTurn;
      delete e.departureTurn;
      applyEffects(state, [
        { type: 'ACCOUNTABILITY', amount: terms.accountability },
        { type: 'COMPLIANCE_RISK', amount: terms.risk },
        { type: 'MORALE', amount: -4 },
        { type: 'EXECUTIVE_APPROVAL', amount: 4 },
      ]);
      record(
        state,
        e,
        `Made redundant. Severance GBP ${terms.severance}; annual payroll saving GBP ${terms.annualSavings}.`,
      );
    }
  }
  state.personnelActionsLeft--;
  refresh(state);
  return state;
}
export function arriveRecruits(state: GameState) {
  for (const hire of state.recruitment.filter(
    (r) => r.status === 'pending' && r.dueTurn <= state.turn,
  )) {
    hire.status = 'joined';
    const employee = structuredClone(hire.employee);
    state.employees.push(employee);
    record(
      state,
      employee,
      'First day. Laptop requested. Meeting invitations already received.',
    );
  }
}
export function processPersonnel(state: GameState) {
  for (const e of state.employees) {
    if (!employed(e)) continue;
    const rng = randomFor(state.seed, `personnel-${state.turn}-${e.id}`);
    if (e.status === 'notice') {
      if ((e.departureTurn ?? state.turn + 1) <= state.turn) {
        e.status = 'resigned';
        e.workload = 0;
        record(
          state,
          e,
          'Notice complete. Left the organisation with the only working copy of the handover.',
        );
      }
      continue;
    }
    if (e.status === 'absent') {
      e.stress = clamp(e.stress - 20);
      e.morale = clamp(e.morale + 3);
      if ((e.returnTurn ?? state.turn + 1) <= state.turn) {
        e.status = 'active';
        delete e.returnTurn;
        record(
          state,
          e,
          'Returned from absence. The backlog sends its regards.',
        );
      }
      continue;
    }
    e.absenceRisk = clamp((e.stress - 55) * 0.5, 0, 25);
    e.resignationRisk = clamp(
      Math.max(0, e.stress - 55) * 0.15 +
        Math.max(0, 45 - e.morale) * 0.25 -
        e.loyalty * 0.04,
      0,
      20,
    );
    if (rng.value() * 100 < e.resignationRisk && state.turn < state.maxTurns) {
      e.status = 'notice';
      e.departureTurn = Math.min(state.maxTurns, state.turn + 2);
      record(
        state,
        e,
        `Handed in notice; leaves week ${e.departureTurn}. A retention offer is still possible.`,
      );
    } else if (
      rng.value() * 100 < e.absenceRisk &&
      state.turn < state.maxTurns
    ) {
      e.status = 'absent';
      e.returnTurn = state.turn + rng.int(1, 2);
      e.workload = 0;
      record(
        state,
        e,
        `Off with stress until week ${e.returnTurn}. Capacity is temporarily unavailable.`,
      );
    }
  }
  refresh(state);
}
export function refreshCandidates(state: GameState) {
  state.candidates = generateCandidates(state.seed, state.turn);
  state.personnelActionsLeft = 3;
}
export function generateOfficeMandate(state: GameState): BoardObjective {
  const rng = randomFor(state.seed, 'office-mandate');
  const officeId: OfficeId = rng.value() > 0.5 ? 'albion' : 'continental';
  const name = officeId === 'albion' ? 'Albion' : 'Continental';
  const other = officeId === 'albion' ? 'continental' : 'albion';
  const base = { id: 'office', metric: 'office' as const, officeId };
  switch (rng.int(0, 3)) {
    case 0:
      return {
        ...base,
        officeRule: 'difference',
        target: 6,
        label: `${name} must lead by at least 6 employees`,
      };
    case 1:
      return {
        ...base,
        officeRule: 'ratio',
        target: 1.2,
        label: `${name} must be at least 20% larger than the other office`,
      };
    case 2:
      return {
        ...base,
        officeRule: 'consolidate',
        departmentId: 'service',
        target: 5,
        label: `Consolidate all Customer Service in ${name}, retaining at least 5 staff`,
      };
    default:
      return {
        ...base,
        officeRule: 'grow-shrink',
        target: 3,
        initialTargetHeadcount: headcount(state, officeId),
        initialOtherHeadcount: headcount(state, other),
        label: `Grow ${name} by 3 and shrink the other office by 3`,
      };
  }
}
