import { departmentDefinitions } from '../data/departments';
import type { Employee, GameState } from '../models/game';
import { randomFor } from './random';
import { events } from '../data/events';
import { updateDepartments } from './systems';
import { generateEmployee, generateCandidates } from './employees';
export function createGame(input = 'SLUT-ALPHA-01'): GameState {
  const seed = input.trim().slice(0, 80) || 'SLUT-ALPHA-01';
  const rng = randomFor(seed, 'initial');
  const employees: Employee[] = Array.from({ length: 61 }, (_, i) =>
    generateEmployee(
      seed,
      `employee-${i}`,
      departmentDefinitions[i % 9].id,
      i < 32 ? 'albion' : 'continental',
    ),
  );
  const targetOffice = rng.value() > 0.5 ? 'albion' : 'continental';
  const state: GameState = {
    gameId: `run-${seed}`,
    seed,
    turn: 1,
    maxTurns: 20,
    status: 'running',
    managementActionUsed: false,
    personnelActionsLeft: 3,
    candidates: generateCandidates(seed, 1),
    recruitment: [],
    company: {
      name: 'Omniform Group',
      initialTurnover: 24700000,
      cash: 2500000,
      pendingCosts: 0,
      totalDecisionCosts: 0,
    },
    offices: [
      { id: 'albion', name: 'Albion', location: 'National office / West' },
      {
        id: 'continental',
        name: 'Continental',
        location: 'National office / East',
      },
    ],
    departments: departmentDefinitions.map((d) => ({
      id: d.id,
      name: d.name,
      workload: 0,
      baselineWorkload: 0,
      capacity: 0,
      performance: 100,
      budget: 100000,
      officePresence: { albion: 0, continental: 0 },
    })),
    employees,
    products: [
      {
        id: 'p1',
        name: 'Omniform Essential',
        demand: 100,
        availability: 92,
        quality: 80,
        status: 'launched',
      },
    ],
    customers: {
      complaintBacklog: 12,
      responseTime: 1.2,
      escalatedCustomers: 0,
      majorAccountsAtRisk: 0,
    },
    logistics: {
      ordersPending: 0,
      ordersShipped: 0,
      lateOrders: 0,
      lostShipments: 0,
      customsHolds: 0,
      freightCost: 0,
    },
    boardObjectives: [
      {
        id: 'growth',
        label: 'Grow annualised turnover by 20%',
        metric: 'turnover',
        target: 29640000,
      },
      {
        id: 'exposure',
        label: 'Keep personal accountability at 25 or below',
        metric: 'accountability',
        target: 25,
      },
      {
        id: 'office',
        label: `${targetOffice === 'albion' ? 'Albion' : 'Continental'} must lead by 6 employees`,
        metric: 'office',
        target: 6,
        officeId: targetOffice,
      },
    ],
    activeEvents: [
      { eventId: events[rng.int(0, events.length - 1)].id, turn: 1 },
    ],
    delayedEffects: [],
    eventHistory: [],
    metrics: {
      turnover: 24700000,
      previousTurnover: 24700000,
      profit: 0,
      accountability: 25,
      executiveApproval: 55,
      customerSatisfaction: 76,
      morale: 72,
      complianceRisk: 18,
      operationalHealth: 100,
    },
    history: [],
    financials: {
      revenue: 0,
      payroll: 0,
      shipping: 0,
      operating: 0,
      productCosts: 0,
      decisions: 0,
      profit: 0,
    },
  };
  updateDepartments(state);
  for (const d of state.departments) {
    d.baselineWorkload = Math.round(d.capacity * (0.84 + rng.value() * 0.1));
    d.workload = d.baselineWorkload;
  }
  updateDepartments(state);
  state.metrics.morale =
    employees.reduce((s, e) => s + e.morale, 0) / employees.length;
  state.history.push({ ...state.metrics, turn: 0 });
  return state;
}
