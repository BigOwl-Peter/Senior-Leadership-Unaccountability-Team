import { z } from 'zod';
import { logisticsSchema } from './logistics';
import { politicsSchema } from './politics';
const office = z.enum(['albion', 'continental']);
const department = z.enum([
  'sales',
  'service',
  'logistics',
  'operations',
  'product',
  'finance',
  'hr',
  'it',
  'compliance',
  'bdm',
  'specialists',
]);
export const worldSchema = z.object({
  logistics: logisticsSchema.optional(),
  politics: politicsSchema.optional(),
  avatar: z.enum(['fixer', 'operator', 'diplomat', 'auditor']),
  name: z.string().min(1).max(40),
  team: department,
  office,
  position: z.object({
    x: z.number().min(32).max(1568),
    y: z.number().min(32).max(1024),
  }),
  corruption: z.object({
    albion: z.number().min(0).max(100),
    continental: z.number().min(0).max(100),
  }),
  mdFavor: z.number().min(0).max(100),
  nextLocal: z.number().int().nonnegative(),
  nextMD: z.number().int().nonnegative(),
  serial: z.number().int().nonnegative(),
  flight: z
    .object({ to: office, arrives: z.number().int().nonnegative() })
    .optional(),
  visits: z.object({
    albion: z.number().int().nonnegative(),
    continental: z.number().int().nonnegative(),
  }),
  cases: z
    .array(
      z.object({
        id: z.string(),
        kind: z.enum(['local', 'md']),
        template: z.number().int().min(0).max(8),
        office,
        employeeId: z.string(),
        departmentId: department,
        opened: z.number().int().nonnegative(),
        due: z.number().int().nonnegative(),
        choice: z.enum(['comply', 'document', 'refuse', 'expired']).optional(),
        outcome: z.string().optional(),
      }),
    )
    .max(50),
  log: z.array(z.object({ at: z.number(), text: z.string() })).max(40),
});
export type WorldCareer = z.infer<typeof worldSchema>;
export type WorldCase = WorldCareer['cases'][number];
export type Avatar = WorldCareer['avatar'];
export type WorldChoice = 'comply' | 'document' | 'refuse';
export const offices = {
  albion: {
    name: 'London',
    country: 'United Kingdom',
    code: 'LHR',
    short: 'UK',
  },
  continental: {
    name: 'Cape Town',
    country: 'South Africa',
    code: 'CPT',
    short: 'SA',
  },
};
export const characters: {
  id: Avatar;
  name: string;
  title: string;
  perk: string;
  skin: string;
  hair: string;
  coat: string;
}[] = [
  {
    id: 'fixer',
    name: 'Alex Morgan',
    title: 'The fixer',
    perk: 'Half-price favours. Full-price consequences.',
    skin: '#d6a27d',
    hair: '#423229',
    coat: '#5b7587',
  },
  {
    id: 'operator',
    name: 'Zanele Dube',
    title: 'The operator',
    perk: 'Clean-ups remove 4 extra corruption.',
    skin: '#8b573c',
    hair: '#221f25',
    coat: '#bc6358',
  },
  {
    id: 'diplomat',
    name: 'Sam Patel',
    title: 'The diplomat',
    perk: 'Refusing the MD costs less favour.',
    skin: '#b98157',
    hair: '#29272c',
    coat: '#55846c',
  },
  {
    id: 'auditor',
    name: 'Charlie Reed',
    title: 'The paper trail',
    perk: 'Written approvals remove 2 extra accountability.',
    skin: '#e0b397',
    hair: '#c4b5a4',
    coat: '#967bab',
  },
];
export const mdName = 'Maxwell Devereux';
export const mdMoods = [
  'Chemical optimism',
  'Paranoid audit',
  'Three-a.m. vision',
  'Executive comedown',
];
export const mdMood = (elapsed: number) =>
  mdMoods[Math.floor(elapsed / 90) % mdMoods.length];
export const mdOffice = (elapsed: number) =>
  Math.floor(elapsed / 180) % 2 === 0
    ? ('albion' as const)
    : ('continental' as const);
export const localScripts = [
  [
    'Preferred supplier',
    "The supplier is the MD's cousin. The tender was competitive: two of his companies entered.",
    'Approve the preferred supplier',
    'Demand a signed procurement exception',
    'Reopen a fair tender',
  ],
  [
    'Expense archaeology',
    'The team offsite receipt includes a yacht. Finance suggests classifying the sea as a meeting room.',
    'Approve strategic maritime alignment',
    'Get the MD to sign the receipt',
    'Reject the claim and repay staff expenses',
  ],
  [
    'Credit transfer',
    'Someone put their name on my work. Apparently attribution is now a leadership competency.',
    'Give the director the credit',
    'Record the actual author in the minutes',
    'Correct the presentation publicly',
  ],
  [
    'Ghost consultant',
    'The consultant has invoiced for thinking about thinking. Nobody has met them. Their rate is inspirational.',
    'Pay the thought leadership invoice',
    'Require written executive approval',
    'Cancel the contract and fund the team',
  ],
  [
    'Quarter-end miracle',
    "We can book next quarter's work today if we stop using the word next. The spreadsheet is emotionally ready.",
    'Recognise the imaginary revenue',
    "Request the Finance director's signature",
    'Keep the books honest',
  ],
  [
    'Data makeover',
    'These red cells are bringing down the mood. We have been asked whether the numbers come in green.',
    'Recolour the dashboard',
    'Attach the original numbers to the pack',
    'Fix the underlying backlog',
  ],
  [
    'The unofficial fund',
    'There is a petty cash envelope labelled stakeholder acceleration. It is not particularly petty.',
    'Top up the acceleration fund',
    'Request a named executive sponsor',
    'Close the fund and reconcile the books',
  ],
  [
    'Overtime laundering',
    'We have been told to record unpaid overtime as voluntary enthusiasm. I am running low on enthusiasm.',
    'Approve the enthusiasm policy',
    'Get HR to accept written ownership',
    'Pay the overtime and reduce the queue',
  ],
  [
    'Missing equipment',
    'Four laptops have become one executive massage chair. Procurement calls it a consolidation.',
    'Approve asset consolidation',
    'Demand a signed asset transfer',
    'Buy replacement equipment',
  ],
] as const;
export const mdScripts = [
  [
    'The 400% plan',
    'I have had a tremendous idea during a very energetic bathroom break. Quadruple revenue by lunch. Reduce headcount first.',
    'Launch the impossible plan',
    'Ask for written ownership of the target',
    'Refuse and protect team capacity',
  ],
  [
    'Reverse everything',
    "Remember yesterday's strategy? Sabotage. I need the opposite immediately. Put yesterday's failures under your name.",
    'Implement the opposite strategy',
    "Attach yesterday's signed instruction",
    'Keep the sensible plan',
  ],
  [
    'Private jet, public value',
    'My supplements are working beautifully. Book me a jet for a meeting that could be a voice note. It is about visibility.',
    'Approve the executive jet',
    'Put the request on the board record',
    'Offer a scheduled flight',
  ],
  [
    'The loyalty test',
    'Someone has been reporting accurate numbers. Find them and remove their access to numbers.',
    'Suppress the unfriendly figures',
    'Commission an independently owned review',
    'Protect the reporting team',
  ],
  [
    'Urgent rebrand',
    'I have not slept and the company name is holding us back. Replace every sign. Use a font that says ungovernable.',
    'Approve the overnight rebrand',
    'Require a signed scope and budget',
    'Defer it until the MD has slept',
  ],
  [
    'Blame without borders',
    'The other office caused this. I have not checked which office you are in, but it was definitely the other one.',
    'Move the liability overseas',
    'Record the decision and its owner',
    'Stop the inter-office blame transfer',
  ],
  [
    'Wellness initiative',
    'Staff are exhausted. I am not. My solution is mandatory sunrise enthusiasm. Attendance will be mistaken for consent.',
    'Mandate enthusiasm sessions',
    'Ask HR and the MD to sign the risk',
    'Fund proper recovery time',
  ],
  [
    'The disappearing minutes',
    'The board minutes mention me eleven times. Make that zero. My legal team calls it an aspirational edit.',
    'Sanitise the minutes',
    'Keep the signed original in the archive',
    'Send the unedited minutes to the board',
  ],
  [
    'A small favour',
    'I am being persecuted by receipts. Become the accountable owner of everything I approved while feeling invincible.',
    'Accept the executive delegation',
    'Return the paperwork for MD signature',
    'Decline in front of witnesses',
  ],
] as const;
export const scriptFor = (item: WorldCase) =>
  (item.kind === 'md' ? mdScripts : localScripts)[item.template];
export const chatter = [
  'The meeting about meetings has been extended.',
  'I delegated the blame before the task arrived.',
  'HR says burnout is a personal branding issue.',
  'My manager is very visible. Mostly in my slides.',
  'The MD has changed the target again.',
  'This coffee has more accountability than the board.',
  'Nobody read the appendix. We are safe for now.',
  'An action plan is not the same as an action.',
];
