import type { DepartmentId, GameEffect, GameEvent } from '../models/game';
import type { Conversation } from './teams';

type Approach =
  | 'invest'
  | 'rush'
  | 'trial'
  | 'refuse'
  | 'audit'
  | 'delegate'
  | 'disclose'
  | 'conceal'
  | 'compensate'
  | 'negotiate'
  | 'train'
  | 'wait';
type Option = [label: string, approach: Approach, followUp?: string];
type Email = [
  id: string,
  title: string,
  body: string,
  options: [Option, Option, Option],
];
type DepartmentDeck = {
  owner: DepartmentId;
  opposing: DepartmentId;
  objection: string;
  emails: Email[];
};
const decks: DepartmentDeck[] = [
  {
    owner: 'sales',
    opposing: 'operations',
    objection:
      'Please include the delivery team in the promise before including the promise in our targets.',
    emails: [
      [
        'exclusive',
        'A customer wants exclusivity without the exclusive price',
        'Our largest prospect wants us to stop serving their competitors. They describe the lost business as evidence of partnership.',
        [
          ['Price the exclusivity properly', 'negotiate'],
          ['Sign before Legal notices', 'rush', 'contract-overflow'],
          ['Keep the market open', 'refuse'],
        ],
      ],
      [
        'tender',
        'Tender deadline: the demo includes features we do not have',
        'The bid presentation contains a working integration. Product says it is a screenshot. The buyer wants to see it live tomorrow.',
        [
          ['Fund a limited working demo', 'trial'],
          [
            'Describe the screenshot as production-ready',
            'conceal',
            'account-review',
          ],
          ['Correct the tender response', 'disclose'],
        ],
      ],
      [
        'commission',
        'Two salespeople have claimed the same commission',
        'One found the customer; the other knows a director. Both have already spent the bonus and copied Payroll.',
        [
          ['Review the evidence and split fairly', 'audit'],
          ['Pay both to protect the quarter', 'compensate'],
          ['Ask the sales manager to adjudicate', 'delegate'],
        ],
      ],
      [
        'renewal',
        'Renewal threatened over a promise from the previous director',
        'The customer has a signed email promising lifetime support. The director who wrote it now describes that period as a learning journey.',
        [
          ['Negotiate a paid support transition', 'negotiate'],
          ['Honour the promise with funded cover', 'invest'],
          [
            'Deny that lifetime meant this lifetime',
            'conceal',
            'account-review',
          ],
        ],
      ],
      [
        'reseller',
        'A reseller wants our logo on an untested bundle',
        'The distributor will place a large order if we certify their bundled service. Nobody here has used the service.',
        [
          ['Certify only after testing', 'audit'],
          ['Approve the badge and book the order', 'rush', 'recall'],
          ['Offer a non-certified pilot', 'trial'],
        ],
      ],
      [
        'export',
        'New market launch requires local support we cannot yet provide',
        'Sales has found a promising export territory. The launch plan lists translation, returns and weekend support as local details.',
        [
          ['Fund a staged local launch', 'invest'],
          ['Test demand with a capped pilot', 'trial'],
          [
            'Launch and route calls to the existing team',
            'rush',
            'contract-overflow',
          ],
        ],
      ],
    ],
  },
  {
    owner: 'service',
    opposing: 'sales',
    objection:
      'Please remember that saving a customer and promising them absolutely anything are different activities.',
    emails: [
      [
        'vipqueue',
        'The VIP support queue now contains every customer',
        'Account managers have upgraded all their customers to priority support. The regular queue is empty; the urgent queue is on fire.',
        [
          ['Publish enforceable service tiers', 'audit'],
          ['Buy temporary support capacity', 'invest'],
          ['Let account managers agree exceptions', 'delegate'],
        ],
      ],
      [
        'refund',
        'Refund requests exceed the authority of everyone answering them',
        'Customers wait three days for approval of a small refund. They spend those three days leaving increasingly creative reviews.',
        [
          ['Give agents a capped refund budget', 'compensate'],
          ['Pilot delegated refunds with checks', 'trial'],
          ['Keep every refund with leadership', 'wait'],
        ],
      ],
      [
        'reviewvideo',
        'A complaint video is outperforming our marketing campaign',
        'A customer recorded seventeen transfers between departments. Marketing wants permission to call the reach encouraging.',
        [
          ['Apologise and explain the remedy', 'disclose'],
          ['Offer compensation and a named owner', 'compensate'],
          [
            'Question whether the customer called correctly',
            'conceal',
            'account-review',
          ],
        ],
      ],
      [
        'supportbot',
        'The support bot has invented a refund policy',
        'Our chatbot promised a full refund, a replacement and a complimentary upgrade. Its customer satisfaction scores are excellent.',
        [
          ['Suspend it and audit affected cases', 'audit'],
          ['Restrict it to a supervised pilot', 'trial'],
          [
            'Ask customers to distinguish advice from policy',
            'conceal',
            'data-request',
          ],
        ],
      ],
      [
        'accessibility',
        'Customers cannot use the new support portal',
        'The portal cannot be operated with a keyboard. The supplier calls this a modern interaction model. Several customers call it unusable.',
        [
          ['Fund the accessibility fixes', 'invest'],
          ['Provide an assisted alternative immediately', 'compensate'],
          ['Accept the supplier assurance for now', 'wait', 'audit-finding'],
        ],
      ],
      [
        'handoff',
        'A support case has crossed both offices twelve times',
        'Albion owns the account, Continental owns the product and neither owns the problem. The customer has started numbering our apologies.',
        [
          ['Assign one accountable case owner', 'delegate'],
          ['Bring both teams into a funded resolution', 'invest'],
          ['Publish the timeline and apologise', 'disclose'],
        ],
      ],
    ],
  },
  {
    owner: 'logistics',
    opposing: 'finance',
    objection:
      'Please separate the cheapest quote from the total cost of the decision.',
    emails: [
      [
        'temperature',
        'A refrigerated shipment arrived suspiciously warm',
        'The temperature logger shows a gap exactly matching the journey. The carrier says the product looked cold on departure.',
        [
          ['Quarantine and inspect the shipment', 'audit'],
          ['Replace affected stock promptly', 'compensate'],
          ['Release it against the delivery date', 'rush', 'recall'],
        ],
      ],
      [
        'pallets',
        'The warehouse is full of pallets nobody owns',
        'Three suppliers charge pallet deposits. None will collect the pallets because each says the other two own them.',
        [
          ['Negotiate one collection contract', 'negotiate'],
          ['Fund sorting and reconciliation', 'invest'],
          [
            'Move the pallets into the fire route temporarily',
            'conceal',
            'audit-finding',
          ],
        ],
      ],
      [
        'customscode',
        'The tariff code saves money and may be fictional',
        'A broker found a much cheaper customs classification. The description appears to cover agricultural ornaments, not our product.',
        [
          ['Obtain a documented classification review', 'audit'],
          ['Use the cheaper code immediately', 'rush', 'border-fine'],
          ['Budget the higher duty while negotiating', 'negotiate'],
        ],
      ],
      [
        'lastmile',
        'The carrier marked fifty parcels delivered to reception',
        'The addresses include houses with no reception. The carrier has provided one photograph of a hedge.',
        [
          ['Replace losses and pursue the carrier', 'compensate'],
          ['Open a formal carrier investigation', 'audit'],
          [
            'Ask recipients to search their reception areas',
            'wait',
            'carrier-claim',
          ],
        ],
      ],
      [
        'dockslot',
        'Two offices booked the same loading slot',
        'Both teams describe their shipment as business critical. The warehouse has one loading dock and no interest in strategic alignment.',
        [
          ['Pay for an additional evening slot', 'invest'],
          ['Negotiate priority against customer deadlines', 'negotiate'],
          ['Delegate the argument to the shift lead', 'delegate'],
        ],
      ],
      [
        'returnsstock',
        'Returned units are being shipped as new',
        'The system treats a customer return as available inventory before anyone inspects it. The warehouse calls this circular efficiency.',
        [
          ['Add an inspection hold', 'audit'],
          ['Fund a dedicated returns lane', 'invest'],
          ['Continue until a customer objects', 'conceal', 'recall'],
        ],
      ],
    ],
  },
  {
    owner: 'operations',
    opposing: 'sales',
    objection:
      'A more ambitious completion date does not create more hours or more competent hands.',
    emails: [
      [
        'maintenance',
        'Preventive maintenance clashes with the growth presentation',
        'The production line needs a shutdown. Sales has already sold the capacity. Engineering says the shutdown can be planned or unplanned.',
        [
          ['Fund a planned maintenance window', 'invest'],
          ['Pilot a reduced production schedule', 'trial'],
          ['Run through the warning lights', 'rush', 'erp-outage'],
        ],
      ],
      [
        'roster',
        'The new shift pattern depends on one employee never sleeping',
        'The rota meets every target because it counts the same specialist on three shifts. HR has requested the spreadsheet password.',
        [
          ['Recruit temporary specialist cover', 'invest'],
          ['Reduce the service commitment', 'refuse'],
          ['Ask the team to manage resilience', 'delegate'],
        ],
      ],
      [
        'qualitygate',
        'Removing a quality check would improve throughput figures',
        'A process review identified inspection as non-value-adding time. The customer who found the last defect has a different process review.',
        [
          ['Retain checks and improve the bottleneck', 'invest'],
          ['Trial sampling with documented limits', 'trial'],
          ['Remove the inspection stage', 'rush', 'recall'],
        ],
      ],
      [
        'singlepoint',
        'One employee owns the only working procedure',
        'The procedure is saved on a personal desktop under final-final-USE-THIS. Its author has booked two weeks off.',
        [
          ['Fund cross-training before the leave', 'train'],
          ['Document and test the procedure', 'audit'],
          ['Ask the manager to sort out cover', 'delegate'],
        ],
      ],
      [
        'overtimerecords',
        'Actual overtime and reported overtime disagree',
        'The dashboard says the team finished on time. Building access records suggest the dashboard left several hours before everyone else.',
        [
          ['Correct the report and pay the hours', 'disclose'],
          ['Fund a workload reset', 'compensate'],
          ['Maintain the approved dashboard', 'conceal', 'grievance-finding'],
        ],
      ],
      [
        'outsourcing',
        'Outsourcing proposal assumes the supplier already knows the job',
        'The cost-saving case includes no training, migration or supervision. Procurement says these are transition opportunities.',
        [
          ['Fund a controlled handover', 'invest'],
          ['Run a parallel pilot', 'trial'],
          ['Transfer the work immediately', 'rush', 'contract-overflow'],
        ],
      ],
    ],
  },
  {
    owner: 'product',
    opposing: 'compliance',
    objection:
      'A launch announcement is not evidence that the product meets its claims.',
    emails: [
      [
        'roadmap',
        'The roadmap contains three mutually exclusive priorities',
        'Each director approved a different top priority. The product team has requested either a ranking or additional dimensions of time.',
        [
          ['Run one prioritisation review', 'audit'],
          ['Pilot the smallest viable release', 'trial'],
          ['Commit to all three', 'rush', 'forecast-miss'],
        ],
      ],
      [
        'licence',
        'A component licence does not permit commercial use',
        'The prototype uses a free component. Its licence explicitly excludes our intended use. The demo went very well.',
        [
          ['Purchase a commercial licence', 'invest'],
          ['Replace the component before release', 'train'],
          ['Ship and discuss licensing later', 'conceal', 'audit-finding'],
        ],
      ],
      [
        'sunset',
        'A product retirement strands a loyal customer',
        'The old product costs more to support than it earns. One customer built their entire process around it and has not read the retirement notice.',
        [
          ['Negotiate a funded migration', 'negotiate'],
          ['Offer a transition credit', 'compensate'],
          ['Switch it off on the announced date', 'refuse'],
        ],
      ],
      [
        'beta',
        'Beta testers thought beta meant a finished product',
        'The sales page says early access in small print. The invoice says full price in large print. Support is learning the distinction live.',
        [
          ['Make the limitations explicit', 'disclose'],
          ['Refund testers who need stability', 'compensate'],
          [
            'Call defects an iterative partnership',
            'conceal',
            'account-review',
          ],
        ],
      ],
      [
        'packclaim',
        'Packaging promises performance the lab could not reproduce',
        'Marketing measured the claim under ideal conditions. The lab has asked which planet supplied those conditions.',
        [
          ['Correct the claim before printing', 'audit'],
          ['Fund another controlled test', 'trial'],
          ['Print the approved headline', 'rush', 'recall'],
        ],
      ],
      [
        'featurevote',
        'The feature vote was won by one very persistent customer',
        'The portal records four hundred votes from one account. Sales says enthusiasm should not be penalised by arithmetic.',
        [
          ['Validate demand with other accounts', 'audit'],
          ['Offer a paid custom development', 'negotiate'],
          ['Build the winning feature now', 'rush', 'forecast-miss'],
        ],
      ],
    ],
  },
  {
    owner: 'finance',
    opposing: 'operations',
    objection:
      'Please show which actual work disappears when the spreadsheet says the cost disappears.',
    emails: [
      [
        'invoice',
        'A duplicate invoice has passed three approval stages',
        'The supplier invoice appears twice with different punctuation. Both copies have been approved by people praised for attention to detail.',
        [
          ['Reconcile before payment', 'audit'],
          ['Let Accounts Payable resolve it', 'delegate'],
          [
            'Pay now to protect the supplier relationship',
            'wait',
            'fraud-review',
          ],
        ],
      ],
      [
        'budgetfreeze',
        'The spending freeze includes safety-critical repairs',
        'The board announced a universal freeze. Facilities wants to know whether universal includes the lift that stops between floors.',
        [
          ['Fund a documented safety exception', 'invest'],
          ['Escalate the exception openly', 'disclose'],
          ['Ask Facilities to remain within budget', 'delegate'],
        ],
      ],
      [
        'baddebt',
        'Record sales include a customer who cannot pay',
        'The quarter looks excellent until someone opens the aged-debt report. The largest debtor has stopped answering anything except new-order emails.',
        [
          ['Negotiate payment security', 'negotiate'],
          ['Disclose the likely write-off', 'disclose'],
          [
            'Book another order to improve the trend',
            'conceal',
            'forecast-miss',
          ],
        ],
      ],
      [
        'currency',
        'An exchange-rate assumption expired before the contract',
        'The quote used last quarter currency rates. Treasury says optimism is not a hedging instrument.',
        [
          ['Renegotiate the price clause', 'negotiate'],
          ['Buy protection at a known cost', 'invest'],
          ['Keep the budget rate in the forecast', 'conceal', 'margin-review'],
        ],
      ],
      [
        'lease',
        'The cheap office lease includes expensive invisible services',
        'Cleaning, security and heating are all optional extras. The landlord says the quoted price was for the concept of an office.',
        [
          ['Negotiate a complete occupancy price', 'negotiate'],
          ['Audit competing premises properly', 'audit'],
          ['Sign to secure the headline saving', 'rush', 'consultant-scope'],
        ],
      ],
      [
        'capitalise',
        'The loss disappears if we call the cost an asset',
        'A consultant proposes capitalising a failed project. Their fee is calculated as a share of the improvement they create.',
        [
          ['Ask for independent accounting review', 'audit'],
          ['Report the cost plainly', 'disclose'],
          ['Use the proposed classification', 'conceal', 'audit-finding'],
        ],
      ],
    ],
  },
  {
    owner: 'hr',
    opposing: 'finance',
    objection:
      'People cannot be retained with a benefit that appears only in a presentation.',
    emails: [
      [
        'paybands',
        'The pay bands overlap everywhere except where staff need them',
        'Two colleagues doing the same job are in different bands because one joined during a recruitment emergency. Both can read job adverts.',
        [
          ['Fund a pay-equity correction', 'compensate'],
          ['Audit roles against published bands', 'audit'],
          ['Ask managers to handle expectations', 'delegate'],
        ],
      ],
      [
        'probation',
        'A probation review is due for someone nobody has trained',
        'The manager wants to fail the new starter for not following procedures. The procedures have never been shared with the new starter.',
        [
          ['Extend with a funded training plan', 'train'],
          ['Review the manager evidence', 'audit'],
          ['Approve the failed probation', 'refuse'],
        ],
      ],
      [
        'exitinterview',
        'Exit interviews name the same manager six times',
        'HR sees a pattern. The manager sees six people who could not meet their standards. Their own appraisal is outstanding.',
        [
          ['Commission an independent review', 'audit'],
          ['Fund coaching and monitor outcomes', 'train'],
          ['File the comments as anecdotal', 'conceal', 'grievance-finding'],
        ],
      ],
      [
        'benefits',
        'The advertised benefit is unavailable to most employees',
        'The wellness allowance requires prior approval, an approved supplier and a weekday appointment during a shift. Uptake is reassuringly low.',
        [
          ['Remove the access barriers', 'compensate'],
          ['Pilot a usable allowance', 'trial'],
          ['Celebrate the budget underspend', 'conceal', 'grievance-finding'],
        ],
      ],
      [
        'reference',
        'A departing executive has written their own reference',
        'The draft credits them with every successful project and omits the ongoing investigation. They have asked HR to sign before lunch.',
        [
          ['Provide a factual verified reference', 'audit'],
          ['Explain the limits directly', 'disclose'],
          ['Sign the supplied version', 'conceal', 'audit-finding'],
        ],
      ],
      [
        'hybrid',
        'The new attendance policy has no desks behind it',
        'Everyone must attend Tuesday. There are desks for half the staff. The policy author works remotely on Tuesdays.',
        [
          ['Pilot team-led attendance planning', 'trial'],
          ['Fund the required workspace', 'invest'],
          ['Delegate desk allocation to managers', 'delegate'],
        ],
      ],
    ],
  },
  {
    owner: 'it',
    opposing: 'operations',
    objection:
      'Please include recovery time in the change plan, not only in the incident report afterwards.',
    emails: [
      [
        'backup',
        'The backup is green because nobody has tried restoring it',
        'The dashboard reports one hundred percent backup success. A restore test recovered a folder called placeholder.',
        [
          ['Fund a proper recovery test', 'audit'],
          ['Build a second verified backup route', 'invest'],
          ['Accept the dashboard until renewal', 'conceal', 'erp-outage'],
        ],
      ],
      [
        'access',
        'A former employee still approves purchase orders',
        'Their account was retained for continuity. It has since approved purchases after their leaving date and while they were on holiday abroad.',
        [
          ['Revoke access and audit transactions', 'audit'],
          ['Assign the investigation to IT and Finance', 'delegate'],
          ['Keep the account until the backlog clears', 'wait', 'fraud-review'],
        ],
      ],
      [
        'shadowai',
        'Staff are pasting customer records into an unapproved AI tool',
        'The team found a faster way to summarise cases. The tool terms describe uploaded content as a valuable learning resource.',
        [
          ['Stop uploads and review exposure', 'audit'],
          ['Fund an approved restricted alternative', 'invest'],
          ['Call the trial unofficial', 'conceal', 'data-request'],
        ],
      ],
      [
        'passwords',
        'The shared password is displayed on the visitor screen',
        'A meeting-room computer opened the team password spreadsheet during a client presentation. Several visitors took useful notes.',
        [
          ['Rotate credentials and disclose the incident', 'disclose'],
          ['Fund access-management replacement', 'invest'],
          ['Ask attendees not to use what they saw', 'conceal', 'fraud-review'],
        ],
      ],
      [
        'migration',
        'The migration window overlaps the biggest sales day',
        'IT booked the only quiet weekend. Sales has announced a weekend promotion. Both have circulated evidence that the other team approved it.',
        [
          ['Fund a rehearsed alternative window', 'invest'],
          ['Pilot the migration on a small group', 'trial'],
          ['Proceed with the original window', 'rush', 'erp-outage'],
        ],
      ],
      [
        'licenceseats',
        'We are paying for software seats assigned to empty chairs',
        'The licence list includes former employees, a test account and the office printer. The printer has premium collaboration access.',
        [
          ['Audit and reclaim unused licences', 'audit'],
          ['Delegate recurring licence ownership', 'delegate'],
          ['Renew everything to avoid disruption', 'wait', 'consultant-scope'],
        ],
      ],
    ],
  },
  {
    owner: 'compliance',
    opposing: 'sales',
    objection:
      'Commercial urgency does not change the evidence we will need when somebody asks questions.',
    emails: [
      [
        'gifts',
        'The tender evaluator received our expensive gift hamper',
        'Sales calls it relationship building. The procurement policy calls it prohibited. The hamper has already been opened.',
        [
          ['Disclose and document the incident', 'disclose'],
          ['Commission an independent review', 'audit'],
          ['Classify it as seasonal marketing', 'conceal', 'audit-finding'],
        ],
      ],
      [
        'whistle',
        'An anonymous report contains unusually specific invoice numbers',
        'The allegation describes a supplier conflict of interest. The named manager says anonymity proves a lack of credibility.',
        [
          ['Protect the report and investigate independently', 'audit'],
          ['Assign independent external support', 'invest'],
          ['Forward it to the named manager', 'conceal', 'grievance-finding'],
        ],
      ],
      [
        'consent',
        'The mailing list has more addresses than consent records',
        'Marketing merged several old spreadsheets. The campaign is ready and the consent column is described as a legacy concern.',
        [
          ['Verify consent before sending', 'audit'],
          ['Run a small permission-refresh campaign', 'trial'],
          ['Send now and handle opt-outs later', 'rush', 'data-request'],
        ],
      ],
      [
        'certification',
        'The certificate on our website expired last month',
        'The renewal assessment was postponed to save travel costs. The website still says independently certified and Sales has linked it in a tender.',
        [
          ['Correct the website and notify affected bids', 'disclose'],
          ['Fund the renewal assessment', 'invest'],
          [
            'Leave the badge until the assessor returns',
            'conceal',
            'audit-finding',
          ],
        ],
      ],
      [
        'retentionclock',
        'Deletion policy conflicts with a legal hold',
        'IT is ready to purge old records. Legal has requested some of those records. Both instructions arrived with the word mandatory.',
        [
          ['Pause deletion and reconcile the hold', 'audit'],
          ['Fund a segregated legal archive', 'invest'],
          ['Let IT follow the existing schedule', 'delegate'],
        ],
      ],
      [
        'supplierethics',
        'The ethical supplier declaration was signed by the salesperson',
        'The supplier assessment contains no supporting evidence. Procurement says the signature is very confident.',
        [
          ['Verify the supply chain evidence', 'audit'],
          ['Trial a qualified alternative supplier', 'trial'],
          [
            'Accept the declaration to preserve pricing',
            'conceal',
            'supplier-break',
          ],
        ],
      ],
    ],
  },
];

const profiles: Record<
  Approach,
  { description: string; effects: GameEffect[] }
> = {
  invest: {
    description:
      'Fund delivery capacity now; costs rise but the team gets relief.',
    effects: [
      { type: 'COST', amount: 26000 },
      { type: 'CUSTOMER_SATISFACTION', amount: 3 },
    ],
  },
  rush: {
    description:
      'Capture revenue quickly while carrying more execution and compliance risk.',
    effects: [
      { type: 'TURNOVER', amount: 220000 },
      { type: 'COMPLIANCE_RISK', amount: 5 },
      { type: 'EXECUTIVE_APPROVAL', amount: 3 },
    ],
  },
  trial: {
    description: 'Limit the commitment and pay for a controlled test.',
    effects: [
      { type: 'COST', amount: 11000 },
      { type: 'TURNOVER', amount: 45000 },
      { type: 'ACCOUNTABILITY', amount: 1 },
    ],
  },
  refuse: {
    description:
      'Decline the commitment; protect capacity at a commercial cost.',
    effects: [
      { type: 'TURNOVER', amount: -90000 },
      { type: 'EXECUTIVE_APPROVAL', amount: -2 },
    ],
  },
  audit: {
    description:
      'Spend time and money establishing evidence; reduce compliance exposure.',
    effects: [
      { type: 'COST', amount: 9000 },
      { type: 'COMPLIANCE_RISK', amount: -5 },
      { type: 'ACCOUNTABILITY', amount: 2 },
    ],
  },
  delegate: {
    description:
      'Keep ownership with the team, transferring work and personal exposure.',
    effects: [
      { type: 'ACCOUNTABILITY', amount: -4 },
      { type: 'EXECUTIVE_APPROVAL', amount: 1 },
    ],
  },
  disclose: {
    description:
      'Make the issue visible now; protect customers but accept personal scrutiny.',
    effects: [
      { type: 'ACCOUNTABILITY', amount: 6 },
      { type: 'COMPLIANCE_RISK', amount: -7 },
      { type: 'CUSTOMER_SATISFACTION', amount: 2 },
      { type: 'EXECUTIVE_APPROVAL', amount: -2 },
    ],
  },
  conceal: {
    description:
      'Preserve the approved narrative; deferred exposure remains with the business.',
    effects: [
      { type: 'ACCOUNTABILITY', amount: -5 },
      { type: 'COMPLIANCE_RISK', amount: 8 },
      { type: 'EXECUTIVE_APPROVAL', amount: 3 },
    ],
  },
  compensate: {
    description: 'Pay to repair the relationship and improve morale.',
    effects: [
      { type: 'COST', amount: 18000 },
      { type: 'MORALE', amount: 3 },
      { type: 'CUSTOMER_SATISFACTION', amount: 3 },
    ],
  },
  negotiate: {
    description: 'Trade speed for a more defensible commercial agreement.',
    effects: [
      { type: 'COST', amount: 5000 },
      { type: 'TURNOVER', amount: 70000 },
      { type: 'EXECUTIVE_APPROVAL', amount: -1 },
    ],
  },
  train: {
    description: 'Take time out of delivery to build resilience.',
    effects: [
      { type: 'COST', amount: 14000 },
      { type: 'MORALE', amount: 4 },
      { type: 'COMPLIANCE_RISK', amount: -2 },
    ],
  },
  wait: {
    description:
      'Avoid immediate spending while the unresolved issue consumes capacity.',
    effects: [
      { type: 'CUSTOMER_SATISFACTION', amount: -3 },
      { type: 'MORALE', amount: -2 },
      { type: 'ACCOUNTABILITY', amount: -1 },
    ],
  },
};
const rows = decks.flatMap((deck) =>
  deck.emails.map((email) => ({ deck, email })),
);
export const careerEmails: GameEvent[] = rows.map(({ deck, email }) => ({
  id: `career-${email[0]}`,
  title: email[1],
  description: email[2],
  category: 'Department escalation',
  departmentId: deck.owner,
  workload: 35,
  choices: email[3].map(([label, approach, followUp], i) => ({
    id: `option-${i}`,
    label,
    description: profiles[approach].description,
    immediateEffects: [
      ...profiles[approach].effects,
      {
        type: 'WORKLOAD' as const,
        departmentId: deck.owner,
        amount:
          approach === 'invest' || approach === 'refuse'
            ? -30
            : approach === 'rush' || approach === 'wait'
              ? 45
              : 20,
      },
    ],
    ...(approach === 'train'
      ? {
          delayedEffects: [
            {
              delay: 2,
              title: `${email[1]}: trained cover clears backlog`,
              effects: [
                {
                  type: 'WORKLOAD' as const,
                  departmentId: deck.owner,
                  amount: -65,
                },
              ],
            },
          ],
        }
      : {}),
    ...(followUp ? { followUps: [{ eventId: followUp, delay: 65 }] } : {}),
  })),
}));
export const careerConversations: Record<string, Conversation> =
  Object.fromEntries(
    rows.map(({ deck, email }) => [
      `career-${email[0]}`,
      {
        owner: deck.owner,
        subject: email[1],
        proposal: email[2],
        defaultChoice: 'option-2',
        objection: { team: deck.opposing, text: deck.objection },
        reply: `We still need a decision on this. Without sign-off the team will proceed with: ${email[3][2][0]}.`,
      },
    ]),
  );
