import type { DepartmentId } from '../models/game';
import { expandedConversations } from './expandedEvents';
import { careerConversations } from './careerEmails';
export const teams: Record<
  DepartmentId,
  { initials: string; color: string; lead: string; role: string }
> = {
  sales: {
    initials: 'MC',
    color: '#3174ad',
    lead: 'Morgan Clarke',
    role: 'Head of Sales',
  },
  service: {
    initials: 'JR',
    color: '#af5266',
    lead: 'Jamie Reed',
    role: 'Customer Service Lead',
  },
  logistics: {
    initials: 'AP',
    color: '#9b7226',
    lead: 'Alex Patel',
    role: 'Logistics Manager',
  },
  operations: {
    initials: 'TB',
    color: '#39826f',
    lead: 'Taylor Bennett',
    role: 'Operations Lead',
  },
  product: {
    initials: 'QH',
    color: '#8855a1',
    lead: 'Quinn Hughes',
    role: 'Product Lead',
  },
  finance: {
    initials: 'SK',
    color: '#527d52',
    lead: 'Sam Kelly',
    role: 'Finance Director',
  },
  hr: {
    initials: 'RL',
    color: '#ab6850',
    lead: 'Riley Lane',
    role: 'People Partner',
  },
  it: {
    initials: 'CG',
    color: '#4b7399',
    lead: 'Casey Grant',
    role: 'IT Lead',
  },
  compliance: {
    initials: 'DE',
    color: '#8c666f',
    lead: 'Drew Evans',
    role: 'Compliance Lead',
  },
};
export interface Conversation {
  owner: DepartmentId;
  subject: string;
  proposal: string;
  defaultChoice: string;
  objection: { team: DepartmentId; text: string };
  reply: string;
}
export const teamPriorities: Record<DepartmentId, string> = {
  sales: 'Close the deal. Protect the quarter.',
  service: 'Keep the customer. Clear the queue.',
  logistics: 'Get the shipment out correctly.',
  operations: 'Make promises match available capacity.',
  product: 'Ship something that actually works.',
  finance: 'Protect the budget and the cost target.',
  hr: 'Protect staff capacity and morale.',
  it: 'Fix the system, not another workaround.',
  compliance: 'Keep an accurate, defensible record.',
};
export const preferredResponses: Partial<
  Record<DepartmentId, Record<string, string>>
> = {
  sales: {
    contract: 'accept',
    launch: 'launch',
    overtime: 'push',
    budget: 'release',
    customers: 'refund',
  },
  finance: {
    contract: 'phase',
    budget: 'freeze',
    people: 'webinar',
    it: 'manual',
    launch: 'pilot',
    customers: 'review',
    overtime: 'pause',
  },
  operations: {
    contract: 'phase',
    overtime: 'pause',
    it: 'fix',
    budget: 'release',
    launch: 'delay',
    people: 'relief',
  },
  service: {
    customers: 'own',
    contract: 'phase',
    launch: 'delay',
    people: 'relief',
  },
  compliance: {
    audit: 'correct',
    customs: 'proper',
    launch: 'delay',
    contract: 'phase',
  },
  hr: { people: 'relief', overtime: 'pause', contract: 'phase' },
  product: { launch: 'delay', contract: 'phase', budget: 'release' },
  logistics: { customs: 'proper', contract: 'phase', overtime: 'overtime' },
  it: { it: 'fix', budget: 'release', people: 'relief' },
};
export const conversations: Record<string, Conversation> = {
  ...careerConversations,
  ...expandedConversations,
  budget: {
    owner: 'finance',
    subject: 'PO approval: release funds or keep the freeze?',
    proposal:
      'We have paused supplier orders to protect the cost target. Please approve a release if Operations really needs the parts. Otherwise the freeze stays.',
    defaultChoice: 'freeze',
    objection: {
      team: 'operations',
      text: 'We do really need the parts. They are the parts used to make the products that Sales has sold.',
    },
    reply:
      'The supplier cut-off is approaching. I need a budget decision, not a statement of intent.',
  },
  audit: {
    owner: 'compliance',
    subject: 'Executive signature required on audit submission',
    proposal:
      'This report does not match the actual process. Please authorise a correction or explicitly sign the existing version. Without approval, we will withhold it.',
    defaultChoice: 'withhold',
    objection: {
      team: 'finance',
      text: 'Missing this deadline will show up in the board pack. Is there a way to be accurate and on time?',
    },
    reply:
      'I will not sign on your behalf. Please confirm which version leaves this office.',
  },
  overtime: {
    owner: 'operations',
    subject: 'Shift leads propose a stop on rush jobs',
    proposal:
      'The supervisors have voted to cap rush work. Please approve the limit or pay for overtime. Without a response, we are stopping new rush jobs.',
    defaultChoice: 'pause',
    objection: {
      team: 'sales',
      text: 'Those rush jobs are signed orders. We cannot casually un-promise them. Who is calling the customers?',
    },
    reply:
      'The next shift is clocking in. The supervisors need a decision now.',
  },
  contract: {
    owner: 'sales',
    subject: 'Approval: next-day delivery for the national account',
    proposal:
      'We can close this today. I propose accepting the contract and sorting capacity afterwards. Can you sign off? If I do not hear back, I will take the order.',
    defaultChoice: 'accept',
    objection: {
      team: 'operations',
      text: 'Please do not promise next-day delivery. We have not even cleared yesterday. We need a phased rollout.',
    },
    reply:
      'The customer is waiting on my call. Can someone give me an actual decision?',
  },
  customs: {
    owner: 'logistics',
    subject: 'Customs forms: who is owning this?',
    proposal:
      'The new forms are blocking dispatch. I need budget and someone from Compliance. Without approval, Customer Service will have to handle the paperwork.',
    defaultChoice: 'delegate',
    objection: {
      team: 'compliance',
      text: 'We need to validate the tariff codes first. Passing this to the call queue does not make it compliant.',
    },
    reply:
      'The carrier is asking for a release time. We cannot keep the loading bay on hold.',
  },
  customers: {
    owner: 'service',
    subject: 'Escalation: the customer wants your name',
    proposal:
      'The account has called three times. I recommend compensation. If nobody approves it, I will open a formal customer journey review to buy us time.',
    defaultChoice: 'review',
    objection: {
      team: 'finance',
      text: 'Compensation needs a budget owner. Please do not code it as miscellaneous stakeholder engagement again.',
    },
    reply:
      'They are still on hold. I have run out of different ways to say shortly.',
  },
  it: {
    owner: 'it',
    subject: 'Order tracker locked. Requesting repair budget.',
    proposal:
      'We can fix the access problem properly. Please approve the repair. Otherwise we will send Operations a manual workaround.',
    defaultChoice: 'manual',
    objection: {
      team: 'operations',
      text: 'A manual workaround is more work for the same people. We need the tracker back, not another spreadsheet.',
    },
    reply:
      'People have started making local copies. We now have four versions of the truth.',
  },
  people: {
    owner: 'hr',
    subject: 'Engagement survey: approval before publication',
    proposal:
      'The teams are asking for cover, not a campaign. I recommend temporary support. If this is left with us, the appreciation webinar is ready to send.',
    defaultChoice: 'webinar',
    objection: {
      team: 'finance',
      text: 'Temporary cover is unbudgeted. We could fund it, but the savings presentation would need another slide.',
    },
    reply:
      'The managers want to know whether they can tell staff anything concrete.',
  },
  launch: {
    owner: 'product',
    subject: 'Launch sign-off: outstanding quality issue',
    proposal:
      'We found a fault during testing. I need a decision before the launch slot. Without sign-off, I will delay for quality checks.',
    defaultChoice: 'delay',
    objection: {
      team: 'sales',
      text: 'The customer has the launch date in writing. A delay will affect this quarter. Can we call it a pilot?',
    },
    reply:
      'The release team is ready. Are we launching, piloting or postponing?',
  },
};
