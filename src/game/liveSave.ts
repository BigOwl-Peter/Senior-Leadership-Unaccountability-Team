import { z } from 'zod';
import { gameStateSchema } from './save';
import { conversations } from '../data/teams';
import { getEvent } from '../data/events';
import { SESSION_SECONDS, WEEK_SECONDS } from './live';
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
]);
const second = z.number().int().min(0).max(SESSION_SECONDS);
export const liveSaveSchema = z.object({
  schemaVersion: z.literal(2),
  session: z.object({
    game: gameStateSchema,
    organisation: z
      .object({
        teams: z
          .array(
            z.object({
              id: department,
              policy: z.enum(['balanced', 'growth', 'quality', 'people']),
              trust: z.number().min(0).max(100),
              changes: z.number().int().nonnegative(),
              week: z.number().int().positive(),
            }),
          )
          .max(9),
        cases: z
          .array(
            z.object({
              id: z.string(),
              employeeId: z.string(),
              departmentId: department,
              topic: z.number().int().min(0).max(11),
              opened: second,
              due: second,
              status: z.enum(['open', 'owned', 'resolved', 'escalated']),
              action: z.enum(['support', 'team', 'dismiss']).optional(),
              outcome: z.string().optional(),
            }),
          )
          .max(100),
        backlog: z.number().min(0).max(300),
        defects: z.number().min(0).max(100),
        exposure: z.number().min(0).max(100),
        lostAccounts: z.number().int().nonnegative(),
        lastIncident: z.string(),
      })
      .optional(),
    elapsed: second,
    paused: z.boolean(),
    speed: z.union([z.literal(1), z.literal(2), z.literal(4)]),
    nextArrival: z.number().int().nonnegative(),
    scheduledEvents: z
      .array(
        z.object({
          eventId: z.string(),
          dueAt: second,
          parentRequestId: z.string(),
        }),
      )
      .default([]),
    requests: z
      .array(
        z.object({
          id: z.string(),
          eventId: z.string(),
          departmentId: department,
          createdAt: second,
          originalDeadline: second.optional(),
          deadline: second,
          status: z.enum(['pending', 'delegated', 'resolved', 'expired']),
          choiceId: z.string().optional(),
          delegatedTo: department.optional(),
          resolveAt: second.optional(),
          extended: z.boolean(),
          reminded: z.boolean(),
          read: z.boolean(),
          parentRequestId: z.string().optional(),
          senderName: z.string().optional(),
        }),
      )
      .min(1)
      .max(100),
    messages: z
      .array(
        z.object({
          id: z.string(),
          requestId: z.string().optional(),
          departmentId: department,
          author: z.union([department, z.literal('you'), z.literal('system')]),
          authorName: z.string().optional(),
          text: z.string(),
          at: second,
          kind: z.enum([
            'request',
            'chat',
            'decision',
            'escalation',
            'autonomous',
          ]),
        }),
      )
      .max(1500),
  }),
  highScores: z
    .array(
      z.object({
        seed: z.string(),
        score: z.number().finite(),
        turnover: z.number().finite(),
        date: z.string(),
      }),
    )
    .max(10),
});
export function parseLiveSave(text: string) {
  const save = liveSaveSchema.parse(JSON.parse(text));
  const { session } = save;
  const { game } = session;
  if (session.organisation) {
    const org = session.organisation;
    if (
      org.teams.length !== 9 ||
      new Set(org.teams.map((t) => t.id)).size !== 9 ||
      new Set(org.cases.map((c) => c.id)).size !== org.cases.length ||
      org.cases.some(
        (c) =>
          !game.employees.some((e) => e.id === c.employeeId) ||
          c.opened > session.elapsed ||
          c.due < c.opened,
      )
    )
      throw new Error('Invalid organisation state.');
  }
  if (
    game.activeEvents.length ||
    game.turn !==
      Math.min(20, Math.floor(session.elapsed / WEEK_SECONDS) + 1) ||
    (game.status === 'finished') !== (session.elapsed === SESSION_SECONDS)
  )
    throw new Error('Inconsistent clock state.');
  if (
    new Set(game.departments.map((d) => d.id)).size !== 9 ||
    new Set(game.offices.map((o) => o.id)).size !== 2 ||
    new Set(game.employees.map((e) => e.id)).size !== game.employees.length
  )
    throw new Error('Invalid entity identities.');
  if (
    new Set(session.requests.map((r) => r.id)).size !== session.requests.length
  )
    throw new Error('Duplicate request.');
  for (const request of session.requests) {
    const event = getEvent(request.eventId);
    if (
      request.departmentId !== conversations[event.id].owner ||
      request.createdAt > session.elapsed ||
      request.deadline < request.createdAt
    )
      throw new Error('Invalid request.');
    if (
      request.choiceId &&
      !event.choices.some((c) => c.id === request.choiceId)
    )
      throw new Error('Invalid response.');
    if (
      request.status === 'delegated' &&
      (!request.delegatedTo || request.resolveAt === undefined)
    )
      throw new Error('Missing owner.');
    if (['resolved', 'expired'].includes(request.status) && !request.choiceId)
      throw new Error('Missing resolution.');
    if (
      request.parentRequestId &&
      !session.requests.some(
        (r) =>
          r.id === request.parentRequestId && r.createdAt <= request.createdAt,
      )
    )
      throw new Error('Missing parent request.');
  }
  for (const scheduled of session.scheduledEvents) {
    if (
      !getEvent(scheduled.eventId).followUpOnly ||
      !session.requests.some((r) => r.id === scheduled.parentRequestId)
    )
      throw new Error('Invalid follow-up.');
  }
  if (
    new Set(game.recruitment.map((r) => r.id)).size !==
      game.recruitment.length ||
    new Set(game.candidates.map((c) => c.id)).size !== game.candidates.length
  )
    throw new Error('Duplicate recruitment identity.');
  if (
    game.recruitment.some(
      (r) =>
        r.status === 'pending' &&
        game.employees.some((e) => e.id === r.employee.id),
    )
  )
    throw new Error('Recruit already employed.');
  if (
    session.messages.some(
      (m) =>
        m.at > session.elapsed ||
        (m.requestId && !session.requests.some((r) => r.id === m.requestId)),
    )
  )
    throw new Error('Invalid message.');
  return save;
}
