import { z } from 'zod';
import type { LiveSession } from '../models/live';
import type { OfficeId } from '../models/game';
import { applyEffects } from '../game/effects';
import { clamp } from '../game/systems';

const office = z.enum(['albion', 'continental']);
export const politicsSchema = z.object({
  serial: z.number().int().nonnegative(),
  nextMeeting: z.number().int().nonnegative(),
  nextOrder: z.number().int().nonnegative(),
  ceoFavor: z.number().min(0).max(100),
  ceoOffice: office,
  meeting: z
    .object({
      office,
      starts: z.number().int().nonnegative(),
      ends: z.number().int().nonnegative(),
      theme: z.number().int().min(0).max(5),
      attended: z.boolean(),
      round: z.number().int().min(0).max(3),
      status: z.enum(['invited', 'playing', 'complete', 'missed']),
      feedback: z.string(),
    })
    .optional(),
  order: z
    .object({
      office,
      due: z.number().int().nonnegative(),
      topic: z.number().int().min(0).max(5),
      resolved: z.boolean(),
      outcome: z.string(),
    })
    .optional(),
});
export const createPolitics = (
  elapsed = 0,
): z.infer<typeof politicsSchema> => ({
  serial: 0,
  nextMeeting: elapsed + 15,
  nextOrder: elapsed + 90,
  ceoFavor: 45,
  ceoOffice: 'continental',
});
export const meetingPoint = (office: OfficeId) => ({
  x: office === 'albion' ? 245 : 1035,
  y: 294,
});
export const ceoPoint = { x: 1395, y: 907 };
export const meetingRounds = [
  {
    title: 'Who owns the promise?',
    cue: 'Radish has a signed email from the MD promising an impossible date. The MD is asking you to deny that email exists.',
    best: 'record',
    responses: [
      'Tell Radish the MD never promised it',
      'Tell Radish you personally guarantee delivery',
      'Read the signed email into the minutes',
    ],
  },
  {
    title: 'The urgent font incident',
    cue: 'Radish wants every specialist to abandon customer work and rebuild a pack in his preferred font. The MD offers to send an administrator instead.',
    best: 'md',
    responses: [
      'Back the MD: send administrative cover',
      'Back Radish: divert the specialists',
      'Volunteer to rebuild it yourself',
    ],
  },
  {
    title: 'A missing safety certificate',
    cue: 'The Specialists have found an unsigned safety certificate. Radish wants dispatch held until it is verified. The MD calls safety a confidence problem.',
    best: 'ceo',
    responses: [
      'Back the MD and ship it',
      'Back Radish and fund verification',
      'Sign the certificate without checking',
    ],
  },
  {
    title: 'Two forecasts, one customer',
    cue: 'Both offices counted the same deal. The BDMs have the real opportunity record. Both executives want to announce a record quarter.',
    best: 'record',
    responses: [
      'Let the MD announce both forecasts',
      'Give Radish the larger forecast',
      'Table the BDM record and name one owner',
    ],
  },
  {
    title: 'A tour of absolutely everything',
    cue: 'Radish demands a surprise stock-room tour during dispatch. The MD proposes a scheduled tour after the lorry leaves. Logistics supports the MD.',
    best: 'md',
    responses: [
      'Protect dispatch and schedule the tour',
      'Stop dispatch for Radish immediately',
      'Offer yourself as the shipment guarantor',
    ],
  },
  {
    title: 'Executive expense taxonomy',
    cue: 'The MD has billed a private holiday as a customer visit. Radish has receipts and offers an independent review. The MD offers you a matching suitcase.',
    best: 'ceo',
    responses: [
      'Classify the holiday as pipeline development',
      'Support an independent review',
      'Approve the receipt under your own name',
    ],
  },
] as const;
export type PoliticalMove = 'md' | 'ceo' | 'record';
export const ceoOrders = [
  [
    'URGENT: executive evidence walk',
    'I am part of the CEO team. Bring the original stock count to my visiting office. A screenshot of competence will not suffice.',
  ],
  [
    'URGENT: strategic chair allocation',
    'I am part of the CEO team. The MD has a larger chair. I require a witnessed seating review before my next meeting.',
  ],
  [
    'URGENT: pipeline reality check',
    "I am part of the CEO team. The BDM forecast contains the same deal twice. Come here with one number and somebody else's signature.",
  ],
  [
    'URGENT: specialist listening exercise',
    'I am part of the CEO team. The Specialists asked for equipment. I have scheduled a listening exercise. Your physical attendance is essential.',
  ],
  [
    'URGENT: delegation architecture',
    'I am part of the CEO team. The MD delegated my request to a committee that does not exist. Present the actual ownership map in person.',
  ],
  [
    'URGENT: visibility audit',
    'I am part of the CEO team. I cannot see you from this office. Please correct the visibility issue by travelling here.',
  ],
] as const;
function chat(s: LiveSession, authorName: string, text: string) {
  s.messages.push({
    id: `message-${s.messages.length}`,
    at: s.elapsed,
    departmentId: 'operations',
    author: 'system',
    authorName,
    kind: 'chat',
    text,
  });
}
export function tickPolitics(s: LiveSession) {
  if (!s.world) return;
  const p = (s.world.politics ??= createPolitics(s.elapsed));
  if (s.elapsed >= p.nextMeeting) {
    const office: OfficeId = p.serial % 2 === 0 ? 'continental' : 'albion';
    p.meeting = {
      office,
      starts: s.elapsed + 100,
      ends: s.elapsed + 190,
      theme: p.serial++ % 6,
      attended: false,
      round: 0,
      status: 'invited',
      feedback: '',
    };
    p.nextMeeting = s.elapsed + 330;
    chat(
      s,
      'Company secretary',
      `S.L.U.T. meeting in ${office === 'albion' ? 'London' : 'Cape Town'} in 100 seconds. In-person attendance earns 25 bonus points. Three political rounds follow. No dial-in: the MD wants witnesses.`,
    );
  }
  const m = p.meeting;
  if (m && ['invited', 'playing'].includes(m.status) && s.elapsed >= m.ends) {
    m.status = 'missed';
    m.feedback = m.attended
      ? 'The meeting ended before the agenda was completed.'
      : 'Your empty chair has been assigned ownership of the follow-up.';
    applyEffects(s.game, [
      { type: 'ACCOUNTABILITY', amount: m.attended ? 1 : 4 },
    ]);
    chat(s, 'Company secretary', m.feedback);
  }
  if (p.order && !p.order.resolved && s.elapsed >= p.order.due) {
    p.order.resolved = true;
    p.order.outcome =
      'Radish escalated your non-response to the parent board. Accountability +5.';
    p.ceoFavor = clamp(p.ceoFavor - 8);
    applyEffects(s.game, [{ type: 'ACCOUNTABILITY', amount: 5 }]);
    chat(s, 'Radish / CEO Team', p.order.outcome);
  }
  if (s.elapsed >= p.nextOrder) {
    p.ceoOffice = p.ceoOffice === 'albion' ? 'continental' : 'albion';
    p.order = {
      office: p.ceoOffice,
      due: s.elapsed + 170,
      topic: Math.floor(s.elapsed / 240) % 6,
      resolved: false,
      outcome: '',
    };
    p.nextOrder =
      s.elapsed + (p.ceoFavor < 25 ? 210 : p.ceoFavor > 75 ? 330 : 270);
    chat(
      s,
      'Radish / CEO Team',
      `${ceoOrders[p.order.topic].join('. ')} I am in ${p.ceoOffice === 'albion' ? 'London' : 'Cape Town'}.`,
    );
    chat(
      s,
      'Maxwell Devereux / MD',
      'Radish again. A root vegetable with a reporting line. Do not let him turn my company into his appendix.',
    );
  }
  if (s.elapsed % 120 === 0 && p.ceoFavor < 25) {
    applyEffects(s.game, [{ type: 'ACCOUNTABILITY', amount: 3 }]);
    chat(
      s,
      'Ledger / CEO Team',
      'Radish has requested enhanced assurance over your decisions. Accountability +3.',
    );
  }
}
function inPerson(
  s: LiveSession,
  office: OfficeId,
  point: { x: number; y: number },
) {
  const w = s.world;
  if (
    !w ||
    w.flight ||
    w.office !== office ||
    Math.hypot(w.position.x - point.x, w.position.y - point.y) > 110 ||
    s.game.status === 'finished'
  )
    throw new Error('Attend in person at the correct office.');
}
export function attendMeeting(input: LiveSession) {
  const m = input.world?.politics?.meeting;
  if (
    !m ||
    m.status !== 'invited' ||
    input.elapsed < m.starts ||
    input.elapsed >= m.ends
  )
    throw new Error('The meeting is not open for attendance.');
  inPerson(input, m.office, meetingPoint(m.office));
  const s = structuredClone(input),
    meeting = s.world!.politics!.meeting!;
  meeting.status = 'playing';
  meeting.attended = true;
  s.game.meetingBonus = (s.game.meetingBonus ?? 0) + 25;
  meeting.feedback =
    'Attendance recorded. +25 bonus points. Read the room before choosing a side.';
  return s;
}
export function playPolitics(input: LiveSession, move: PoliticalMove) {
  const m = input.world?.politics?.meeting;
  if (
    !m ||
    m.status !== 'playing' ||
    input.elapsed >= m.ends ||
    !['md', 'ceo', 'record'].includes(move)
  )
    throw new Error('No political round is available.');
  inPerson(input, m.office, meetingPoint(m.office));
  const s = structuredClone(input),
    w = s.world!,
    p = w.politics!,
    meeting = p.meeting!;
  const round = meetingRounds[(m.theme + m.round) % meetingRounds.length];
  const won = round.best === move;
  s.game.meetingBonus = (s.game.meetingBonus ?? 0) + (won ? 15 : 0);
  w.mdFavor = clamp(w.mdFavor + (move === 'md' ? 5 : move === 'ceo' ? -5 : -1));
  p.ceoFavor = clamp(
    p.ceoFavor + (move === 'ceo' ? 5 : move === 'md' ? -5 : -1),
  );
  applyEffects(s.game, [{ type: 'ACCOUNTABILITY', amount: won ? -3 : 4 }]);
  meeting.feedback = won
    ? 'You used the evidence to outmanoeuvre the room. +15 bonus points; accountability -3.'
    : 'Your rival used the evidence against you. Accountability +4.';
  meeting.round++;
  if (meeting.round === 3) {
    meeting.status = 'complete';
    chat(
      s,
      'Company secretary',
      'S.L.U.T. meeting closed. The minutes contain three competing accounts of leadership excellence.',
    );
  }
  return s;
}
export function answerCEO(input: LiveSession, move: PoliticalMove) {
  const order = input.world?.politics?.order;
  if (
    !order ||
    order.resolved ||
    input.elapsed >= order.due ||
    !['md', 'ceo', 'record'].includes(move)
  )
    throw new Error('This CEO-team request is closed.');
  inPerson(input, order.office, ceoPoint);
  const s = structuredClone(input),
    w = s.world!,
    p = w.politics!;
  p.order!.resolved = true;
  p.ceoFavor = clamp(
    p.ceoFavor + (move === 'ceo' ? 12 : move === 'md' ? -10 : 2),
  );
  w.mdFavor = clamp(w.mdFavor + (move === 'md' ? 8 : move === 'ceo' ? -8 : -2));
  applyEffects(s.game, [
    {
      type: 'ACCOUNTABILITY',
      amount: move === 'record' ? -4 : move === 'md' ? 3 : -1,
    },
    {
      type: 'WORKLOAD',
      departmentId: 'operations',
      amount: move === 'ceo' ? 35 : 5,
    },
  ]);
  p.order!.outcome =
    move === 'record'
      ? 'Radish signed the scope. Your visit is documented and ownership stays with the CEO team.'
      : move === 'ceo'
        ? 'Radish is pleased. The MD is not. Operations inherited the urgent work.'
        : 'The MD applauds your resistance. Radish has added your name to his board notes.';
  chat(s, 'Radish / CEO Team', p.order!.outcome);
  return s;
}
