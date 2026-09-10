import { z } from 'zod';
import type { SaveData } from '../models/game';
import { events } from '../data/events';
const finite = z.number().finite();
const percent = finite.min(0).max(100);
const departmentId = z.enum([
  'sales',
  'service',
  'logistics',
  'operations',
  'product',
  'finance',
  'hr',
  'it',
  'compliance',
]);
const officeId = z.enum(['albion', 'continental']);
const metrics = z.object({
  turnover: finite.nonnegative(),
  previousTurnover: finite.nonnegative(),
  profit: finite,
  accountability: percent,
  executiveApproval: percent,
  customerSatisfaction: percent,
  morale: percent,
  complianceRisk: percent,
  operationalHealth: percent,
});
const effect = z.union([
  z.object({
    type: z.enum([
      'TURNOVER',
      'ACCOUNTABILITY',
      'MORALE',
      'EXECUTIVE_APPROVAL',
      'CUSTOMER_SATISFACTION',
      'COMPLIANCE_RISK',
      'COST',
    ]),
    amount: finite,
  }),
  z.object({ type: z.literal('WORKLOAD'), departmentId, amount: finite }),
]);
const employeeSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  surname: z.string(),
  officeId,
  departmentId,
  jobTitle: z.string(),
  salary: finite.nonnegative(),
  competence: percent,
  capacity: finite.nonnegative(),
  workload: finite.nonnegative(),
  morale: percent,
  stress: percent,
  politicalInfluence: percent,
  customerSkill: percent,
  complianceSkill: percent,
  technicalSkill: percent,
  salesSkill: percent,
  loyalty: percent,
  visibility: percent,
  absenceRisk: percent,
  resignationRisk: percent,
  protectedStatus: z.array(z.string()).optional(),
  traits: z.array(z.string()),
  status: z.enum(['active', 'absent', 'notice', 'redundant', 'resigned']),
  promotionLevel: z.number().int().min(0).max(2).optional(),
  returnTurn: z.number().int().positive().optional(),
  departureTurn: z.number().int().positive().optional(),
  history: z.array(z.object({ turn: finite, text: z.string() })).optional(),
});
const schema = z.object({
  schemaVersion: z.literal(1),
  gameVersion: z.literal('0.1.0'),
  currentGame: z.object({
    gameId: z.string(),
    seed: z.string().min(1).max(80),
    turn: z.number().int().min(1).max(20),
    maxTurns: z.literal(20),
    status: z.enum(['running', 'finished']),
    managementActionUsed: z.boolean(),
    personnelActionsLeft: z.number().int().min(0).max(3).default(3),
    decisionTempo: z
      .object({
        total: z.number().finite(),
        count: z.number().int().nonnegative(),
      })
      .optional(),
    candidates: z
      .array(
        z.object({
          id: z.string(),
          employee: employeeSchema,
          role: z.enum(['junior', 'specialist', 'manager']),
          competenceEstimate: z.tuple([percent, percent]),
          interview: z.string(),
          leadTime: z.number().int().min(1).max(3),
        }),
      )
      .default([]),
    recruitment: z
      .array(
        z.object({
          id: z.string(),
          employee: employeeSchema,
          dueTurn: z.number().int().min(1).max(20),
          status: z.enum(['pending', 'joined', 'cancelled']),
        }),
      )
      .default([]),
    company: z.object({
      name: z.string(),
      initialTurnover: finite.positive(),
      cash: finite,
      pendingCosts: finite,
      totalDecisionCosts: finite,
    }),
    offices: z
      .array(z.object({ id: officeId, name: z.string(), location: z.string() }))
      .length(2),
    departments: z
      .array(
        z.object({
          id: departmentId,
          name: z.string(),
          workload: finite.nonnegative(),
          capacity: finite.nonnegative(),
          performance: percent,
          budget: finite,
          managerId: z.string().optional(),
          officePresence: z.object({ albion: finite, continental: finite }),
          baselineWorkload: finite.nonnegative(),
        }),
      )
      .length(9),
    employees: z.array(employeeSchema).min(1),
    products: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        demand: finite,
        availability: percent,
        quality: percent,
        status: z.enum(['development', 'launched', 'withdrawn']),
      }),
    ),
    customers: z.object({
      complaintBacklog: finite,
      responseTime: finite,
      escalatedCustomers: finite,
      majorAccountsAtRisk: finite,
    }),
    logistics: z.object({
      ordersPending: finite,
      ordersShipped: finite,
      lateOrders: finite,
      lostShipments: finite,
      customsHolds: finite,
      freightCost: finite,
    }),
    boardObjectives: z.array(
      z.object({
        id: z.string(),
        label: z.string(),
        metric: z.enum(['turnover', 'accountability', 'office']),
        target: finite,
        officeId: officeId.optional(),
        officeRule: z
          .enum(['difference', 'ratio', 'consolidate', 'grow-shrink'])
          .optional(),
        departmentId: departmentId.optional(),
        initialTargetHeadcount: finite.optional(),
        initialOtherHeadcount: finite.optional(),
      }),
    ),
    activeEvents: z.array(
      z.object({
        eventId: z.string(),
        turn: finite,
        choiceId: z.string().optional(),
      }),
    ),
    delayedEffects: z.array(
      z.object({
        dueTurn: finite,
        title: z.string(),
        effects: z.array(effect),
      }),
    ),
    eventHistory: z.array(
      z.object({
        turn: finite,
        type: z.enum(['decision', 'resolution', 'consequence', 'personnel']),
        title: z.string(),
        description: z.string(),
        effects: z.array(effect).optional(),
      }),
    ),
    metrics,
    history: z.array(metrics.extend({ turn: finite })).min(1),
    financials: z.object({
      revenue: finite,
      payroll: finite,
      shipping: finite,
      operating: finite,
      productCosts: finite,
      decisions: finite,
      profit: finite,
    }),
  }),
  highScores: z.array(
    z.object({
      seed: z.string(),
      score: finite,
      turnover: finite,
      date: z.string(),
    }),
  ),
  settings: z.object({ reducedMotion: z.boolean() }),
});
export const gameStateSchema = schema.shape.currentGame;
export function parseSave(text: string): SaveData {
  const result = schema.parse(JSON.parse(text));
  const game = result.currentGame;
  if (
    new Set(game.departments.map((d) => d.id)).size !== 9 ||
    new Set(game.offices.map((o) => o.id)).size !== 2 ||
    new Set(game.employees.map((e) => e.id)).size !== game.employees.length
  )
    throw new Error('Invalid entity identities.');
  for (const active of game.activeEvents) {
    const event = events.find((e) => e.id === active.eventId);
    if (
      !event ||
      (active.choiceId && !event.choices.some((c) => c.id === active.choiceId))
    )
      throw new Error('Unknown saved decision.');
  }
  if (
    game.status === 'running' &&
    (game.activeEvents.length !== 1 || game.activeEvents[0].turn !== game.turn)
  )
    throw new Error('Missing weekly decision.');
  if (
    game.status === 'finished' &&
    (game.turn !== 20 || game.activeEvents.length !== 0)
  )
    throw new Error('Invalid completed session.');
  return result;
}
