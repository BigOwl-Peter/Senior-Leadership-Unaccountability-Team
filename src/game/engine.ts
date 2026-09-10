import { events, getEvent } from '../data/events';
import type { GameState } from '../models/game';
import { applyEffects } from './effects';
import { randomFor } from './random';
import {
  arriveRecruits,
  processPersonnel,
  refreshCandidates,
} from './personnel';
import { traits } from '../data/people';
import { choiceUnavailable } from './requirements';
import {
  clamp,
  employeeCapacity,
  loadRatio,
  updateDepartments,
} from './systems';
export function transferEmployee(
  input: GameState,
  employeeId: string,
): GameState {
  if (input.status !== 'running' || input.managementActionUsed)
    throw new Error('No office transfer available this week.');
  const state = structuredClone(input);
  const employee = state.employees.find(
    (e) => e.id === employeeId && e.status === 'active',
  );
  if (!employee) throw new Error('Employee unavailable.');
  employee.officeId = employee.officeId === 'albion' ? 'continental' : 'albion';
  employee.morale = clamp(employee.morale - 4);
  employee.stress = clamp(employee.stress + 8);
  applyEffects(state, [
    { type: 'COST', amount: 5000 },
    { type: 'ACCOUNTABILITY', amount: 2 },
  ]);
  state.managementActionUsed = true;
  const workers = state.employees.filter(
    (e) => e.status === 'active' || e.status === 'notice',
  );
  state.metrics.morale =
    workers.reduce((sum, e) => sum + e.morale, 0) / workers.length;
  updateDepartments(state);
  state.eventHistory.push({
    turn: state.turn,
    type: 'decision',
    title: `${employee.firstName} ${employee.surname} transferred`,
    description: `New office: ${employee.officeId}. Relocation cost: GBP 5,000.`,
  });
  return state;
}
export function chooseResponse(
  input: GameState,
  eventId: string,
  choiceId: string,
): GameState {
  if (input.status !== 'running') throw new Error('The session has ended.');
  const state = structuredClone(input);
  const active = state.activeEvents.find(
    (e) => e.eventId === eventId && !e.choiceId,
  );
  if (!active) throw new Error('This decision is not available.');
  const event = getEvent(eventId);
  const choice = event.choices.find((c) => c.id === choiceId);
  if (!choice) throw new Error('Unknown response.');
  const unavailable = choiceUnavailable(state, choice);
  if (unavailable) throw new Error(unavailable);
  active.choiceId = choiceId;
  applyEffects(state, [
    {
      type: 'WORKLOAD',
      departmentId: event.departmentId,
      amount: event.workload,
    },
    ...choice.immediateEffects,
  ]);
  for (const delayed of choice.delayedEffects ?? [])
    state.delayedEffects.push({
      dueTurn: state.turn + delayed.delay,
      title: delayed.title,
      effects: delayed.effects,
    });
  state.eventHistory.push({
    turn: state.turn,
    type: 'decision',
    title: choice.label,
    description: event.title,
    effects: choice.immediateEffects,
  });
  updateDepartments(state);
  return state;
}
export function processTurn(input: GameState): GameState {
  if (input.status === 'finished') return input;
  if (input.activeEvents.some((e) => !e.choiceId))
    throw new Error('Choose a response before closing the week.');
  const state = structuredClone(input);
  const rng = randomFor(state.seed, `week-${state.turn}`);
  arriveRecruits(state);
  for (const delayed of state.delayedEffects.filter(
    (e) => e.dueTurn <= state.turn,
  )) {
    applyEffects(state, delayed.effects);
    state.eventHistory.push({
      turn: state.turn,
      type: 'consequence',
      title: delayed.title,
      description: 'A previous decision has reached your desk again.',
      effects: delayed.effects,
    });
  }
  state.delayedEffects = state.delayedEffects.filter(
    (e) => e.dueTurn > state.turn,
  );
  updateDepartments(state);
  const dept = (id: string) => state.departments.find((d) => d.id === id)!;
  const demandGrowth = clamp(
    state.metrics.turnover / state.company.initialTurnover,
    0.7,
    2,
  );
  for (const d of state.departments) {
    const growthLoad = ['operations', 'logistics', 'service'].includes(d.id)
      ? demandGrowth
      : 1;
    // Remaining work carries forward; baseline demand is added only after each resolution.
    d.workload += Math.max(0, growthLoad - 1) * d.baselineWorkload * 0.45;
  }
  updateDepartments(state);
  for (const e of state.employees) {
    if (e.status !== 'active' && e.status !== 'notice') continue;
    const d = dept(e.departmentId);
    const ratio = loadRatio(d);
    e.workload = employeeCapacity(e) * ratio;
    const resilience = e.traits.reduce(
      (value, name) => value * (traits[name]?.stress ?? 1),
      1,
    );
    e.stress = clamp(
      e.stress + (ratio > 1 ? (ratio - 1) * 18 * resilience : -5),
    );
    e.morale = clamp(
      e.morale + (ratio > 1 ? -(ratio - 1) * 8 : 1.5) - (e.stress > 70 ? 2 : 0),
    );
    e.absenceRisk = clamp((e.stress - 55) * 0.5);
    e.resignationRisk = clamp(
      (e.stress - e.loyalty) * 0.3 + (35 - e.morale) * 0.4,
    );
  }
  const orders = Math.round(400 * demandGrowth);
  const available = orders + state.logistics.ordersPending;
  const shippingRate =
    clamp(
      dept('logistics').performance * (1 - state.metrics.complianceRisk / 400),
      0,
      100,
    ) / 100;
  const shipped = Math.min(available, Math.round(orders * shippingRate));
  state.logistics = {
    ordersPending: available - shipped,
    ordersShipped: shipped,
    lateOrders: available - shipped,
    lostShipments: Math.round((1 - shippingRate) * 4),
    customsHolds: Math.round(state.metrics.complianceRisk / 15),
    freightCost: shipped * 32,
  };
  state.customers.complaintBacklog = Math.max(
    0,
    Math.round(
      state.customers.complaintBacklog * 0.65 +
        (1 - shippingRate) * 35 +
        (100 - dept('service').performance) * 0.5 -
        dept('service').performance * 0.12,
    ),
  );
  state.customers.responseTime =
    Math.round((1 + state.customers.complaintBacklog / 20) * 10) / 10;
  state.customers.escalatedCustomers = Math.floor(
    state.customers.complaintBacklog / 12,
  );
  state.customers.majorAccountsAtRisk = Math.floor(
    state.customers.complaintBacklog / 35,
  );
  state.metrics.customerSatisfaction = clamp(
    state.metrics.customerSatisfaction +
      (dept('service').performance - 85) / 9 -
      state.customers.complaintBacklog / 35 -
      (1 - shippingRate) * 2,
  );
  const productAvailability = clamp(
    dept('operations').performance * 0.6 + shippingRate * 40,
  );
  state.products.forEach((p) => {
    if (p.status === 'launched') p.availability = productAvailability;
  });
  const market = rng.value() * 0.016 - 0.008;
  const change =
    0.004 +
    (dept('sales').performance - 80) / 2200 +
    (state.metrics.customerSatisfaction - 65) / 3500 +
    (productAvailability - 85) / 2500 +
    market;
  state.metrics.previousTurnover = input.history.at(-1)!.turnover;
  state.metrics.turnover = Math.max(
    0,
    Math.round(state.metrics.turnover * (1 + change)),
  );
  const revenue = state.metrics.turnover / 52;
  const payroll = state.employees
    .filter((e) => ['active', 'notice', 'absent'].includes(e.status))
    .reduce((s, e) => s + e.salary / 52, 0);
  const productCosts = revenue * 0.64;
  const operating = 85000;
  const decisions = state.company.pendingCosts;
  const profit =
    revenue -
    payroll -
    state.logistics.freightCost -
    productCosts -
    operating -
    decisions;
  state.financials = {
    revenue,
    payroll,
    shipping: state.logistics.freightCost,
    productCosts,
    operating,
    decisions,
    profit,
  };
  state.metrics.profit = profit;
  state.company.cash += profit;
  state.company.pendingCosts = 0;
  processPersonnel(state);
  const workers = state.employees.filter(
    (e) => e.status === 'active' || e.status === 'notice',
  );
  state.metrics.morale = workers.length
    ? workers.reduce((s, e) => s + e.morale, 0) / workers.length
    : 0;
  state.metrics.operationalHealth =
    state.departments.reduce((s, d) => s + d.performance, 0) /
    state.departments.length;
  state.metrics.complianceRisk = clamp(
    state.metrics.complianceRisk + (90 - dept('compliance').performance) / 8,
  );
  state.metrics.accountability = clamp(
    state.metrics.accountability +
      Math.max(0, 65 - state.metrics.operationalHealth) / 8 +
      Math.max(0, state.metrics.complianceRisk - 60) / 15,
  );
  state.metrics.executiveApproval = clamp(
    state.metrics.executiveApproval +
      (state.metrics.turnover > state.metrics.previousTurnover ? 1.5 : -3) -
      Math.max(0, state.metrics.accountability - 60) / 25,
  );
  state.history.push({ ...state.metrics, turn: state.turn });
  state.eventHistory.push({
    turn: state.turn,
    type: 'resolution',
    title: `Week ${state.turn} filed`,
    description: `Annualised turnover ${state.metrics.turnover >= state.metrics.previousTurnover ? 'increased' : 'declined'}. ${state.customers.complaintBacklog} complaints remain open.`,
  });
  if (state.turn === state.maxTurns) {
    state.status = 'finished';
    state.activeEvents = [];
  } else {
    state.turn += 1;
    arriveRecruits(state);
    refreshCandidates(state);
    state.managementActionUsed = false;
    for (const d of state.departments)
      d.workload =
        d.baselineWorkload + Math.max(0, d.workload - d.capacity) * 0.5;
    updateDepartments(state);
    const previousId = input.activeEvents[0]?.eventId;
    const deck = events.filter((e) => e.id !== previousId);
    state.activeEvents = [
      { eventId: deck[rng.int(0, deck.length - 1)].id, turn: state.turn },
    ];
  }
  return state;
}
