import type { GameEvent } from '../models/game';
export const teamEvents: GameEvent[] = [
  {
    id: 'budget',
    title: 'Finance has frozen the purchase orders.',
    category: 'Budget approval',
    departmentId: 'finance',
    workload: 55,
    description:
      'Finance wants to defer supplier payments. Operations needs parts. Both teams believe the other team should explain this to the board.',
    choices: [
      {
        id: 'release',
        label: 'Release the supplier budget',
        description: 'Pay for the parts and keep the work moving.',
        immediateEffects: [
          { type: 'COST', amount: 22000 },
          { type: 'WORKLOAD', departmentId: 'operations', amount: -60 },
          { type: 'ACCOUNTABILITY', amount: 3 },
        ],
      },
      {
        id: 'freeze',
        label: 'Back the spending freeze',
        description: 'A tidy cost report. An untidy production queue.',
        immediateEffects: [
          { type: 'EXECUTIVE_APPROVAL', amount: 5 },
          { type: 'WORKLOAD', departmentId: 'operations', amount: 65 },
          { type: 'MORALE', amount: -2 },
        ],
      },
      {
        id: 'partial',
        label: 'Release essential orders only',
        description: 'Finance and Operations get half of what they wanted.',
        immediateEffects: [
          { type: 'COST', amount: 10000 },
          { type: 'WORKLOAD', departmentId: 'finance', amount: 20 },
          { type: 'ACCOUNTABILITY', amount: 1 },
        ],
      },
    ],
  },
  {
    id: 'audit',
    title: 'Compliance needs a signature.',
    category: 'Regulatory sign-off',
    departmentId: 'compliance',
    workload: 70,
    description:
      'The audit submission describes a process nobody currently follows. Compliance will not sign it without an executive decision.',
    choices: [
      {
        id: 'correct',
        label: 'Correct the submission',
        description: 'Give Compliance time to report what actually happens.',
        immediateEffects: [
          { type: 'COMPLIANCE_RISK', amount: -10 },
          { type: 'COST', amount: 12000 },
          { type: 'ACCOUNTABILITY', amount: 4 },
        ],
      },
      {
        id: 'submit',
        label: 'Sign the existing report',
        description: 'Meet the deadline and put your name on it.',
        immediateEffects: [
          { type: 'COMPLIANCE_RISK', amount: 12 },
          { type: 'ACCOUNTABILITY', amount: 9 },
          { type: 'EXECUTIVE_APPROVAL', amount: 5 },
        ],
      },
      {
        id: 'withhold',
        label: 'Withhold the submission',
        description: 'Miss the deadline. Avoid certifying the fiction.',
        immediateEffects: [
          { type: 'EXECUTIVE_APPROVAL', amount: -4 },
          { type: 'COMPLIANCE_RISK', amount: 4 },
          { type: 'ACCOUNTABILITY', amount: -3 },
        ],
      },
    ],
  },
  {
    id: 'overtime',
    title: 'Operations wants to stop accepting rush jobs.',
    category: 'Capacity decision',
    departmentId: 'operations',
    workload: 75,
    description:
      'The shift supervisors have agreed to pause rush work. Sales has objected. A final decision is requested before the next batch.',
    choices: [
      {
        id: 'pause',
        label: 'Support the capacity limit',
        description: 'Give the team room to clear the backlog.',
        immediateEffects: [
          { type: 'WORKLOAD', departmentId: 'operations', amount: -105 },
          { type: 'MORALE', amount: 3 },
          { type: 'EXECUTIVE_APPROVAL', amount: -3 },
        ],
      },
      {
        id: 'overtime',
        label: 'Approve paid overtime',
        description: 'Keep the promises, at a price.',
        immediateEffects: [
          { type: 'COST', amount: 18000 },
          { type: 'WORKLOAD', departmentId: 'operations', amount: -80 },
          { type: 'MORALE', amount: -1 },
          { type: 'ACCOUNTABILITY', amount: 3 },
        ],
      },
      {
        id: 'push',
        label: 'Tell them to find capacity',
        description: 'The target remains the target.',
        immediateEffects: [
          { type: 'TURNOVER', amount: 350000 },
          { type: 'MORALE', amount: -4 },
          { type: 'WORKLOAD', departmentId: 'service', amount: 40 },
          { type: 'EXECUTIVE_APPROVAL', amount: 5 },
        ],
      },
    ],
  },
];
