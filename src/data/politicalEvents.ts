import type { GameEvent, DepartmentId } from '../models/game';
import type { Conversation } from './teams';

// Each existing operational scenario gains a separate parent-company political dilemma.
const interventions = [
  [
    'CEO-team certification',
    'Radish has withheld the parent-company signature. "Urgent. I am part of the CEO team. Please send a certified answer before you have one."',
    'Buy an independent certification',
    'Ask Radish to sign the exception',
    "Continue under the MD's verbal authority",
  ],
  [
    'Pipeline ownership dispute',
    'The BDMs sourced the opportunity, Sales claimed it, and the MD has nominated himself for the commission. The client wants one accountable contact.',
    'Fund a joint account team',
    'Record named commercial ownership',
    'Award the MD the credit and rush delivery',
  ],
  [
    'Specialist capacity auction',
    'Two directors have promised the same specialist to different customers. Both promises were marked confidential from the specialist.',
    'Buy qualified external cover',
    'Publish the actual capacity and priority order',
    'Book both jobs and call it stretch capacity',
  ],
  [
    'Parent-company recharge',
    'Head office has charged this project for executive awareness. Finance cannot identify what was delivered, but the invoice is extremely senior.',
    'Pay for a verifiable service instead',
    'Request a signed breakdown from the CEO team',
    'Hide the recharge in the delivery budget',
  ],
  [
    'Board-pack attribution',
    'The CEO team wants a success story by noon. The work is unfinished. Radish says the pack measures confidence, not events.',
    'Fund the remaining delivery work',
    'Attach the real status to the board pack',
    'Publish a completed milestone',
  ],
  [
    'Cross-office handover',
    'London says Cape Town owns the next step. Cape Town has a screenshot proving the opposite. The MD wants the screenshot classified as a training issue.',
    'Fund an in-person joint handover',
    'Get both leads to sign the responsibility map',
    'Transfer the blame across the border',
  ],
  [
    'Executive demonstration',
    'Radish has invited the parent board to watch a live demonstration. The Specialists have a list of limitations. The MD has a larger list of adjectives.',
    'Pay for a tested limited demonstration',
    'Require the sponsor to approve the limitations',
    'Stage the full demonstration without testing',
  ],
  [
    'Customer escalation summit',
    'The customer has discovered three different explanations. The BDM wants honesty, the MD wants alignment, and Radish wants a seat at the top of the agenda.',
    'Fund recovery and a single customer contact',
    'Minute the promises and name their authors',
    'Offer another ambitious promise',
  ],
  [
    'Procurement influence review',
    'A parent-company preferred partner has offered to solve this for double the price. Their proposal contains the CEO-team logo six times and a scope of work zero times.',
    'Run a short competitive procurement',
    'Ask the sponsor to declare the relationship',
    'Use the preferred partner without scrutiny',
  ],
  [
    'Urgent evidence request',
    'Radish needs a new evidence pack in his preferred font. The last pack was approved yesterday. "I am part of the CEO team" has been pasted over the deadline field.',
    'Fund administrative cover for the team',
    'Link the original evidence and request a precise gap',
    'Divert everyone into rebuilding the pack',
  ],
  [
    'Specialist sign-off conflict',
    'The specialist refuses to certify a result they have not checked. The MD considers that a tone issue. Radish has asked whether integrity can be expedited.',
    'Pay for independent technical verification',
    'Protect the specialist with recorded acceptance criteria',
    'Replace verification with executive approval',
  ],
  [
    'BDM territory carve-up',
    'Two BDMs are pursuing the same account in different offices. Head office wants both forecasts counted. The customer has only one budget.',
    'Create a shared account plan and commission split',
    'Record one forecast and a named account owner',
    'Keep both forecasts to protect the growth story',
  ],
] as const;

export function buildPoliticalDeck(source: GameEvent[]) {
  const conversations: Record<string, Conversation> = {};
  const events: GameEvent[] = source.map((original, i) => {
    const scene = interventions[i % interventions.length];
    const owner: DepartmentId = [1, 7, 11].includes(i % interventions.length)
      ? 'bdm'
      : [2, 6, 10].includes(i % interventions.length)
        ? 'specialists'
        : original.departmentId;
    const id = `politics-${original.id}`;
    const title = `${scene[0]}: ${original.title}`;
    const body = `${scene[1]} The live issue: ${original.description}`;
    const cost = 6000 + (i % 9) * 2500;
    const choices: GameEvent['choices'] = [
      {
        id: 'resource',
        label: scene[2],
        description:
          'Spend money to protect delivery; accept visible responsibility.',
        immediateEffects: [
          { type: 'COST', amount: cost },
          { type: 'ACCOUNTABILITY', amount: 2 },
          { type: 'MORALE', amount: 2 },
          { type: 'TURNOVER', amount: 25000 + (i % 5) * 10000 },
          { type: 'WORKLOAD', departmentId: owner, amount: -25 },
        ],
      },
      {
        id: 'record',
        label: scene[3],
        description:
          'Protect the paper trail, but irritate the executive sponsor.',
        immediateEffects: [
          { type: 'ACCOUNTABILITY', amount: -4 },
          { type: 'EXECUTIVE_APPROVAL', amount: -3 },
          { type: 'WORKLOAD', departmentId: owner, amount: 15 },
        ],
        delayedEffects: [
          {
            delay: 2,
            title: `${scene[0]}: the signed record survives review`,
            effects: [{ type: 'COMPLIANCE_RISK', amount: -3 }],
          },
        ],
      },
      {
        id: 'spin',
        label: scene[4],
        description:
          'Win immediate approval at the expense of delivery and future scrutiny.',
        immediateEffects: [
          { type: 'ACCOUNTABILITY', amount: -2 },
          { type: 'EXECUTIVE_APPROVAL', amount: 5 },
          { type: 'WORKLOAD', departmentId: owner, amount: 55 },
        ],
        delayedEffects: [
          {
            delay: 2,
            title: `${scene[0]}: the customer asks for evidence`,
            effects: [
              { type: 'ACCOUNTABILITY', amount: 6 },
              { type: 'TURNOVER', amount: -50000 - (i % 7) * 10000 },
              { type: 'CUSTOMER_SATISFACTION', amount: -3 },
            ],
          },
        ],
      },
    ];
    conversations[id] = {
      owner,
      subject: title,
      proposal: body,
      defaultChoice: 'spin',
      objection: {
        team: owner === 'specialists' ? 'bdm' : 'specialists',
        text: 'We can provide the evidence or the desired answer. Please specify which you are commissioning.',
      },
      reply:
        'The parent-company escalation is still open. Without a decision the executive version becomes the official record.',
    };
    return {
      id,
      title,
      description: body,
      category: 'Parent-company politics',
      departmentId: owner,
      workload: 30 + (i % 4) * 5,
      choices,
    };
  });
  return { events, conversations };
}
