import type { GameEffect, GameEvent } from '../models/game';
import { teamEvents } from './teamEvents';
import { expandedEvents, chainLinks } from './expandedEvents';
const effect = (
  type: Exclude<GameEffect['type'], 'WORKLOAD'>,
  amount: number,
): GameEffect => ({ type, amount });
// A small repeatable scenario deck exercises phase 3; the full event engine is phase 5.
const baseEvents: GameEvent[] = [
  ...teamEvents,
  {
    id: 'customs',
    title: 'The paperwork has changed. Again.',
    category: 'Compliance bulletin',
    departmentId: 'logistics',
    workload: 95,
    description:
      'New customs forms arrive on Monday. Logistics needs time to implement them. The board would prefer that Monday did not affect the quarter.',
    choices: [
      {
        id: 'proper',
        label: 'Implement the requirements',
        description: 'Put Compliance on the paperwork.',
        immediateEffects: [
          effect('COST', 8000),
          effect('ACCOUNTABILITY', 4),
          effect('COMPLIANCE_RISK', -12),
          { type: 'WORKLOAD', departmentId: 'compliance', amount: 65 },
        ],
      },
      {
        id: 'delegate',
        label: 'Give it to Customer Service',
        description: 'They already answer difficult questions.',
        immediateEffects: [
          effect('ACCOUNTABILITY', -6),
          effect('COMPLIANCE_RISK', 8),
          { type: 'WORKLOAD', departmentId: 'service', amount: 110 },
        ],
      },
      {
        id: 'committee',
        label: 'Commission a working group',
        description: 'A robust framework for having more meetings.',
        immediateEffects: [
          effect('COST', 18000),
          effect('ACCOUNTABILITY', -12),
          effect('EXECUTIVE_APPROVAL', 6),
        ],
        delayedEffects: [
          {
            delay: 2,
            title: 'The working group requests more time',
            effects: [
              { type: 'WORKLOAD', departmentId: 'compliance', amount: 95 },
              effect('COMPLIANCE_RISK', 5),
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'contract',
    title: 'Sales has already said yes.',
    category: 'Commercial opportunity',
    departmentId: 'operations',
    workload: 115,
    description:
      "A national account wants next-day delivery at yesterday's prices. Sales has celebrated the win. Operations has not been invited.",
    choices: [
      {
        id: 'accept',
        label: 'Celebrate the new contract',
        description: 'The revenue is real. So are the promises.',
        immediateEffects: [
          effect('TURNOVER', 1800000),
          effect('EXECUTIVE_APPROVAL', 9),
          effect('ACCOUNTABILITY', 5),
          { type: 'WORKLOAD', departmentId: 'logistics', amount: 110 },
        ],
        delayedEffects: [
          {
            delay: 1,
            title: 'The new account asks where everything is',
            effects: [
              effect('CUSTOMER_SATISFACTION', -5),
              { type: 'WORKLOAD', departmentId: 'service', amount: 80 },
            ],
          },
        ],
      },
      {
        id: 'phase',
        label: 'Negotiate a phased rollout',
        description: 'Less impressive. More deliverable.',
        immediateEffects: [
          effect('TURNOVER', 650000),
          effect('ACCOUNTABILITY', 3),
          effect('EXECUTIVE_APPROVAL', -3),
          { type: 'WORKLOAD', departmentId: 'operations', amount: -65 },
        ],
      },
      {
        id: 'outsource',
        label: 'Outsource the fulfilment',
        description: 'Someone else can own the delivery date.',
        immediateEffects: [
          effect('TURNOVER', 1150000),
          effect('COST', 95000),
          effect('ACCOUNTABILITY', -7),
          { type: 'WORKLOAD', departmentId: 'operations', amount: -100 },
        ],
      },
    ],
  },
  {
    id: 'customers',
    title: 'Your most loyal customer is on hold.',
    category: 'Customer escalation',
    departmentId: 'service',
    workload: 105,
    description:
      'Three late orders. Four apology emails. One customer asking to speak to whoever is actually responsible. A troubling development.',
    choices: [
      {
        id: 'own',
        label: 'Take the call personally',
        description: 'Repair the relationship. Become a named contact.',
        immediateEffects: [
          effect('CUSTOMER_SATISFACTION', 9),
          effect('ACCOUNTABILITY', 10),
          { type: 'WORKLOAD', departmentId: 'service', amount: -70 },
        ],
      },
      {
        id: 'refund',
        label: 'Authorise compensation',
        description: 'An apology with a purchase order.',
        immediateEffects: [
          effect('COST', 35000),
          effect('CUSTOMER_SATISFACTION', 5),
          effect('ACCOUNTABILITY', -2),
        ],
      },
      {
        id: 'review',
        label: 'Launch a customer journey review',
        description: 'A six-slide commitment to listening.',
        immediateEffects: [
          effect('ACCOUNTABILITY', -8),
          effect('EXECUTIVE_APPROVAL', 5),
          effect('CUSTOMER_SATISFACTION', -6),
          { type: 'WORKLOAD', departmentId: 'service', amount: 65 },
        ],
      },
    ],
  },
  {
    id: 'it',
    title: 'The spreadsheet has become infrastructure.',
    category: 'Systems incident',
    departmentId: 'it',
    workload: 100,
    description:
      'The order tracker is locked by a colleague on annual leave. IT suggests a fix. Finance suggests asking when they are back.',
    choices: [
      {
        id: 'fix',
        label: 'Fund the repair',
        description: 'Give IT room to remove the dependency.',
        immediateEffects: [
          effect('COST', 24000),
          effect('ACCOUNTABILITY', 4),
          { type: 'WORKLOAD', departmentId: 'it', amount: -80 },
          effect('MORALE', 3),
        ],
      },
      {
        id: 'manual',
        label: 'Introduce a manual workaround',
        description: 'Operational resilience, powered by overtime.',
        immediateEffects: [
          effect('ACCOUNTABILITY', -4),
          effect('MORALE', -3),
          { type: 'WORKLOAD', departmentId: 'operations', amount: 95 },
        ],
      },
      {
        id: 'consult',
        label: 'Bring in a transformation partner',
        description: 'A reassuringly expensive external opinion.',
        immediateEffects: [
          effect('COST', 85000),
          effect('ACCOUNTABILITY', -10),
          effect('EXECUTIVE_APPROVAL', 7),
          { type: 'WORKLOAD', departmentId: 'it', amount: -90 },
        ],
      },
    ],
  },
  {
    id: 'people',
    title: 'The engagement survey is remarkably honest.',
    category: 'People & culture',
    departmentId: 'hr',
    workload: 60,
    description:
      'Employees request manageable workloads. The executive summary currently says they are excited about an opportunity for change.',
    choices: [
      {
        id: 'relief',
        label: 'Buy temporary cover',
        description: 'Give every department some breathing room.',
        immediateEffects: [
          effect('COST', 65000),
          effect('MORALE', 7),
          effect('ACCOUNTABILITY', 4),
          { type: 'WORKLOAD', departmentId: 'operations', amount: -95 },
          { type: 'WORKLOAD', departmentId: 'service', amount: -95 },
        ],
      },
      {
        id: 'webinar',
        label: 'Host an appreciation webinar',
        description: 'Attendance is mandatory. Appreciation is optional.',
        immediateEffects: [
          effect('COST', 4000),
          effect('MORALE', 1),
          effect('ACCOUNTABILITY', -4),
          effect('EXECUTIVE_APPROVAL', 4),
          { type: 'WORKLOAD', departmentId: 'hr', amount: 80 },
        ],
      },
      {
        id: 'reframe',
        label: 'Reframe the survey findings',
        description: 'Publish the executive summary.',
        immediateEffects: [
          effect('MORALE', -5),
          effect('EXECUTIVE_APPROVAL', 9),
          effect('ACCOUNTABILITY', -5),
        ],
      },
    ],
  },
  {
    id: 'launch',
    title: 'The launch date is now a fact.',
    category: 'Product update',
    departmentId: 'product',
    workload: 95,
    description:
      'Marketing has printed the banners. Product has identified a small issue with the product. Both teams would like a decision in writing.',
    choices: [
      {
        id: 'launch',
        label: 'Proceed with the launch',
        description: 'A strong quarter, with follow-up correspondence.',
        immediateEffects: [
          effect('TURNOVER', 1500000),
          effect('EXECUTIVE_APPROVAL', 8),
          effect('ACCOUNTABILITY', 7),
        ],
        delayedEffects: [
          {
            delay: 2,
            title: 'The launch issue becomes a customer issue',
            effects: [
              effect('CUSTOMER_SATISFACTION', -8),
              { type: 'WORKLOAD', departmentId: 'service', amount: 120 },
            ],
          },
        ],
      },
      {
        id: 'delay',
        label: 'Delay for quality checks',
        description: 'Disappoint the board before the customers.',
        immediateEffects: [
          effect('COST', 30000),
          effect('EXECUTIVE_APPROVAL', -5),
          effect('CUSTOMER_SATISFACTION', 4),
          effect('ACCOUNTABILITY', 3),
          { type: 'WORKLOAD', departmentId: 'product', amount: -55 },
        ],
      },
      {
        id: 'pilot',
        label: 'Call it a strategic pilot',
        description: 'A smaller launch with a larger disclaimer.',
        immediateEffects: [
          effect('TURNOVER', 500000),
          effect('ACCOUNTABILITY', -5),
          effect('COST', 16000),
          effect('EXECUTIVE_APPROVAL', 3),
        ],
      },
    ],
  },
];
export const events: GameEvent[] = [
  ...baseEvents.map((event) => ({
    ...event,
    choices: event.choices.map((choice) => ({
      ...choice,
      ...(chainLinks[event.id]?.[choice.id]
        ? {
            followUps: [
              { eventId: chainLinks[event.id][choice.id], delay: 45 },
            ],
          }
        : {}),
    })),
  })),
  ...expandedEvents,
];
export function getEvent(id: string) {
  const event = events.find((e) => e.id === id);
  if (!event) throw new Error(`Unknown event: ${id}`);
  return event;
}
