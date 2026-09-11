import type { DepartmentId } from '../models/game';
import type { LiveRequest, LiveSession, TeamMessage } from '../models/live';
import { createGame } from './generate';
import { businessWeek, tickOrganisation } from './organisation';
import { chooseResponse, processTurn } from './engine';
import { getEvent, events } from '../data/events';
import {
  conversations,
  teams,
  preferredResponses,
  teamPriorities,
} from '../data/teams';
import { departmentDefinitions } from '../data/departments';
import { randomFor } from './random';
import { applyEffects } from './effects';
import { loadRatio, updateDepartments, teamLeadName } from './systems';
import { choiceUnavailable, eventEligible } from './requirements';
import {
  generateOfficeMandate,
  managePersonnel,
  type PersonnelAction,
} from './personnel';
export const SESSION_SECONDS = 1200;
export const WEEK_SECONDS = 60;
export const teamName = (id: DepartmentId) =>
  departmentDefinitions.find((d) => d.id === id)!.name;
export const timeText = (seconds: number) =>
  `${Math.floor(Math.max(0, seconds) / 60)
    .toString()
    .padStart(
      2,
      '0',
    )}:${(Math.max(0, seconds) % 60).toString().padStart(2, '0')}`;
export function sendMessage(
  session: LiveSession,
  message: Omit<TeamMessage, 'id' | 'at'>,
) {
  session.messages.push({
    ...message,
    authorName:
      message.authorName ??
      (message.author === 'you'
        ? 'You'
        : message.author === 'system'
          ? 'Company secretary'
          : teamLeadName(session.game, message.author)),
    id: `message-${session.messages.length}`,
    at: session.elapsed,
  });
}
function arrive(
  session: LiveSession,
  initial = false,
  forcedEventId?: string,
  parentRequestId?: string,
) {
  const rng = randomFor(session.game.seed, `inbox-${session.requests.length}`);
  const eligible = events.filter(
    (e) =>
      !e.followUpOnly &&
      eventEligible(session.game, e) &&
      !session.requests.some(
        (r) =>
          r.eventId === e.id && ['pending', 'delegated'].includes(r.status),
      ),
  );
  if (!eligible.length && !forcedEventId && !initial) {
    session.nextArrival = session.elapsed + 5;
    return;
  }
  const count = (id: string) =>
    session.requests.filter((r) => r.eventId === id).length;
  const leastSeen = Math.min(...eligible.map((e) => count(e.id)));
  const available = eligible.filter((e) => count(e.id) === leastSeen);
  let roll =
    rng.value() * available.reduce((sum, e) => sum + (e.weight ?? 1), 0);
  const drawn =
    available.find((e) => {
      roll -= e.weight ?? 1;
      return roll <= 0;
    }) ?? available[0];
  const event = forcedEventId
    ? getEvent(forcedEventId)
    : initial
      ? getEvent('contract')
      : drawn;
  const conversation = conversations[event.id];
  const request: LiveRequest = {
    id: `request-${session.requests.length}`,
    eventId: event.id,
    departmentId: conversation.owner,
    createdAt: session.elapsed,
    deadline: Math.min(
      SESSION_SECONDS,
      session.elapsed +
        rng.int(38, 52) -
        (session.elapsed >= 720 ? 8 : session.elapsed >= 360 ? 4 : 0),
    ),
    status: 'pending',
    extended: false,
    reminded: false,
    read: false,
    senderName: teamLeadName(session.game, conversation.owner),
    ...(parentRequestId ? { parentRequestId } : {}),
  };
  session.requests.push(request);
  sendMessage(session, {
    requestId: request.id,
    departmentId: request.departmentId,
    author: request.departmentId,
    text: conversation.proposal,
    kind: 'request',
  });
  session.nextArrival =
    session.elapsed + rng.int(22, 29) - (session.elapsed >= 720 ? 5 : 0);
}
export function createLiveSession(seed = 'SLUT-LIVE-01'): LiveSession {
  const game = createGame(seed);
  for (const department of game.departments) {
    const manager = game.employees.find(
      (e) => e.departmentId === department.id,
    )!;
    const [firstName, surname] = teams[department.id].lead.split(' ');
    manager.firstName = firstName;
    manager.surname = surname;
    manager.jobTitle = teams[department.id].role;
    department.managerId = manager.id;
  }
  game.activeEvents = [];
  game.boardObjectives = game.boardObjectives.map((o) =>
    o.metric === 'office' ? generateOfficeMandate(game) : o,
  );
  const session: LiveSession = {
    game,
    durationMinutes: 20,
    elapsed: 0,
    paused: true,
    speed: 1,
    requests: [],
    messages: [],
    nextArrival: 0,
    scheduledEvents: [],
  };
  arrive(session, true);
  return session;
}
function getPending(session: LiveSession, id: string) {
  if (session.game.status === 'finished')
    throw new Error('This appointment has ended.');
  const request = session.requests.find(
    (r) => r.id === id && r.status === 'pending',
  );
  if (!request) throw new Error('This request has already been handled.');
  return request;
}
function recordTempo(
  session: LiveSession,
  request: LiveRequest,
  missed = false,
) {
  const window = Math.max(
    1,
    (request.originalDeadline ?? request.deadline) - request.createdAt,
  );
  const fraction = Math.min(
    1,
    Math.max(0, (session.elapsed - request.createdAt) / window),
  );
  const points = missed ? -1 : 1 - 2 * fraction;
  const tempo = session.game.decisionTempo ?? { total: 0, count: 0 };
  session.game.decisionTempo = {
    total: tempo.total + points,
    count: tempo.count + 1,
  };
}
function resolve(
  session: LiveSession,
  request: LiveRequest,
  choiceId: string,
  source: 'you' | 'timeout' | 'delegate',
) {
  const event = getEvent(request.eventId);
  const choice = event.choices.find((c) => c.id === choiceId);
  if (!choice) throw new Error('Unknown response.');
  const unavailable = choiceUnavailable(session.game, choice);
  if (unavailable) throw new Error(unavailable);
  // Reuse the existing effect engine; request identities live in the real-time inbox.
  session.game.activeEvents = [{ eventId: event.id, turn: session.game.turn }];
  session.game = chooseResponse(session.game, event.id, choiceId);
  session.game.activeEvents = [];
  if (source !== 'delegate')
    recordTempo(session, request, source === 'timeout');
  request.choiceId = choiceId;
  request.status = source === 'timeout' ? 'expired' : 'resolved';
  request.read = source === 'you';
  for (const [index, follow] of (choice.followUps ?? []).entries()) {
    if (
      randomFor(
        session.game.seed,
        `follow-${request.id}-${choice.id}-${index}`,
      ).value() <= (follow.probability ?? 1)
    ) {
      const dueAt = session.elapsed + follow.delay;
      if (dueAt <= SESSION_SECONDS - 20)
        session.scheduledEvents.push({
          eventId: follow.eventId,
          dueAt,
          parentRequestId: request.id,
        });
      else
        sendMessage(session, {
          requestId: request.id,
          departmentId: request.departmentId,
          author: 'system',
          kind: 'chat',
          text: 'The follow-up falls after this appointment and has been handed to the next leadership team.',
        });
    }
  }
  if (source === 'timeout')
    applyEffects(session.game, [{ type: 'ACCOUNTABILITY', amount: 3 }]);
  const owner = request.delegatedTo ?? request.departmentId;
  sendMessage(session, {
    requestId: request.id,
    departmentId: request.departmentId,
    author: source === 'you' ? 'you' : owner,
    kind: 'decision',
    text:
      source === 'you'
        ? `Approved response: ${choice.label}. ${choice.description}`
        : source === 'timeout'
          ? `No sign-off received. We proceeded with: ${choice.label}. Your non-response is in the record. Accountability +3.`
          : `${teamName(owner)} has taken the decision: ${choice.label}. ${teamPriorities[owner]} ${choice.description}`,
  });
  if (source === 'you')
    sendMessage(session, {
      requestId: request.id,
      departmentId: request.departmentId,
      author: request.departmentId,
      kind: 'chat',
      text: `Understood. We are proceeding with "${choice.label.toLowerCase()}". I have copied the affected teams.`,
    });
  updateDepartments(session.game);
}
export function respondLive(
  input: LiveSession,
  id: string,
  choiceId: string,
): LiveSession {
  const next = structuredClone(input);
  resolve(next, getPending(next, id), choiceId, 'you');
  return next;
}
export function delegateLive(
  input: LiveSession,
  id: string,
  departmentId: DepartmentId,
): LiveSession {
  const next = structuredClone(input);
  const request = getPending(next, id);
  if (!next.game.departments.some((d) => d.id === departmentId))
    throw new Error('Unknown department.');
  request.status = 'delegated';
  recordTempo(next, request);
  request.delegatedTo = departmentId;
  request.resolveAt = Math.min(SESSION_SECONDS, next.elapsed + 12);
  request.read = true;
  applyEffects(next.game, [
    { type: 'ACCOUNTABILITY', amount: -5 },
    { type: 'WORKLOAD', departmentId, amount: 40 },
  ]);
  updateDepartments(next.game);
  sendMessage(next, {
    requestId: id,
    departmentId: request.departmentId,
    author: 'you',
    kind: 'decision',
    text: `${teamName(departmentId)}, please own this decision. You have authority to proceed.`,
  });
  sendMessage(next, {
    requestId: id,
    departmentId: request.departmentId,
    author: departmentId,
    kind: 'chat',
    text: 'Received. We are reviewing capacity and will make the call. This is now on our work queue.',
  });
  return next;
}
export function manageLivePersonnel(
  input: LiveSession,
  action: PersonnelAction,
): LiveSession {
  const next = structuredClone(input);
  const oldLength = next.game.eventHistory.length;
  next.game = managePersonnel(next.game, action);
  for (const log of next.game.eventHistory.slice(oldLength))
    sendMessage(next, {
      departmentId: 'hr',
      author: 'hr',
      kind: 'decision',
      text: log.title,
    });
  return next;
}
export function requestAssessment(input: LiveSession, id: string): LiveSession {
  const next = structuredClone(input);
  const request = getPending(next, id);
  if (request.extended)
    throw new Error('An impact assessment has already been requested.');
  request.extended = true;
  request.originalDeadline ??= request.deadline;
  request.deadline = Math.min(SESSION_SECONDS, request.deadline + 15);
  applyEffects(next.game, [
    { type: 'WORKLOAD', departmentId: request.departmentId, amount: 15 },
    { type: 'EXECUTIVE_APPROVAL', amount: -1 },
  ]);
  updateDepartments(next.game);
  const d = next.game.departments.find((d) => d.id === request.departmentId)!;
  sendMessage(next, {
    requestId: id,
    departmentId: request.departmentId,
    author: 'you',
    kind: 'chat',
    text: 'Please send the impact assessment before I sign this off.',
  });
  sendMessage(next, {
    requestId: id,
    departmentId: request.departmentId,
    author: request.departmentId,
    kind: 'chat',
    text: `We are at ${Math.round(loadRatio(d) * 100)}% workload, with ${d.officePresence.albion + d.officePresence.continental} people. I have asked for 15 more seconds. The assessment itself adds 15 work and the board loses 1 approval.`,
  });
  return next;
}
function autonomousWork(session: LiveSession) {
  const rng = randomFor(session.game.seed, `autonomy-${session.elapsed}`);
  const d =
    session.game.departments[rng.int(0, session.game.departments.length - 1)];
  const overloaded = loadRatio(d) > 1.15;
  applyEffects(
    session.game,
    overloaded
      ? [
          { type: 'WORKLOAD', departmentId: 'service', amount: 12 },
          { type: 'MORALE', amount: -0.5 },
        ]
      : [{ type: 'WORKLOAD', departmentId: d.id, amount: -18 }],
  );
  updateDepartments(session.game);
  sendMessage(session, {
    departmentId: d.id,
    author: d.id,
    kind: 'autonomous',
    text: overloaded
      ? `We have stopped non-essential work. The team is overloaded; Customer Service will need to cover the backlog. Service work +12, morale -0.5.`
      : `We agreed a workaround in the team stand-up and cleared 18 units of work. No executive sign-off needed. ${teamLeadName(session.game, d.id).split(' ')[0]}, out.`,
  });
}
export function tickLive(input: LiveSession, seconds = 1): LiveSession {
  if (input.paused || input.game.status === 'finished') return input;
  if (!Number.isInteger(seconds) || seconds < 0 || seconds > SESSION_SECONDS)
    throw new Error('Invalid clock step.');
  let next = structuredClone(input);
  for (let tick = 0; tick < seconds && next.elapsed < SESSION_SECONDS; tick++) {
    next.elapsed++;
    for (const request of next.requests) {
      const conversation = conversations[request.eventId];
      if (
        request.status === 'pending' &&
        next.elapsed === request.createdAt + 4
      )
        sendMessage(next, {
          requestId: request.id,
          departmentId: request.departmentId,
          author: conversation.objection.team,
          text: conversation.objection.text,
          kind: 'chat',
        });
      if (
        request.status === 'pending' &&
        !request.reminded &&
        next.elapsed >= request.deadline - 12
      ) {
        request.reminded = true;
        request.read = false;
        sendMessage(next, {
          requestId: request.id,
          departmentId: request.departmentId,
          author: request.departmentId,
          text: conversation.reply,
          kind: 'escalation',
        });
      }
      if (
        request.status === 'delegated' &&
        next.elapsed >= request.resolveAt!
      ) {
        const d = next.game.departments.find(
          (d) => d.id === request.delegatedTo,
        )!;
        const event = getEvent(request.eventId);
        let choice =
          loadRatio(d) > 1.2
            ? conversation.defaultChoice
            : (preferredResponses[request.delegatedTo!]?.[event.id] ??
              event.choices[0].id);
        const policy = next.organisation?.teams.find(
          (t) => t.id === request.delegatedTo,
        )?.policy;
        if (policy && policy !== 'balanced' && loadRatio(d) <= 1.2) {
          const utility = (candidate: (typeof event.choices)[number]) =>
            candidate.immediateEffects.reduce((value, effect) => {
              if (policy === 'growth')
                return (
                  value +
                  (effect.type === 'TURNOVER'
                    ? effect.amount / 10000
                    : effect.type === 'COST'
                      ? -effect.amount / 50000
                      : 0)
                );
              if (policy === 'quality')
                return (
                  value +
                  (effect.type === 'COMPLIANCE_RISK'
                    ? -effect.amount * 2
                    : effect.type === 'CUSTOMER_SATISFACTION'
                      ? effect.amount
                      : 0)
                );
              return (
                value +
                (effect.type === 'MORALE'
                  ? effect.amount * 3
                  : effect.type === 'WORKLOAD'
                    ? -effect.amount / 10
                    : 0)
              );
            }, 0);
          choice =
            [...event.choices]
              .filter((c) => !choiceUnavailable(next.game, c))
              .sort((a, b) => utility(b) - utility(a))[0]?.id ?? choice;
        }
        const selected = event.choices.find((c) => c.id === choice)!;
        resolve(
          next,
          request,
          choiceUnavailable(next.game, selected)
            ? conversations[event.id].defaultChoice
            : choice,
          'delegate',
        );
      } else if (
        request.status === 'pending' &&
        next.elapsed >= request.deadline
      )
        resolve(next, request, conversation.defaultChoice, 'timeout');
    }
    if (next.elapsed % 30 === 15) autonomousWork(next);
    tickOrganisation(next);
    if (next.elapsed % WEEK_SECONDS === 0) {
      const logLength = next.game.eventHistory.length;
      businessWeek(next);
      next.game = processTurn(next.game);
      next.game.activeEvents = [];
      for (const log of next.game.eventHistory
        .slice(logLength)
        .filter((l) => l.type === 'consequence' || l.type === 'personnel'))
        sendMessage(next, {
          departmentId: log.type === 'personnel' ? 'hr' : 'operations',
          author: log.type === 'personnel' ? 'hr' : 'system',
          kind: 'escalation',
          text:
            log.title +
            (log.type === 'personnel'
              ? ''
              : '. A previous decision has returned to the work queue.'),
        });
      sendMessage(next, {
        departmentId: 'finance',
        author: 'finance',
        kind: 'autonomous',
        text: `Week ${next.game.history.at(-1)!.turn} accounts closed. Annualised turnover is GBP ${(next.game.metrics.turnover / 1e6).toFixed(2)}m. The board has received the figures.`,
      });
    }
    if (next.elapsed >= SESSION_SECONDS - 20 && next.scheduledEvents.length) {
      sendMessage(next, {
        author: 'system',
        departmentId: 'operations',
        kind: 'chat',
        text: `${next.scheduledEvents.length} queued follow-ups handed to the next appointment as the session closes.`,
      });
      next.scheduledEvents = [];
    }
    if (next.game.status === 'finished') continue;
    const due = next.scheduledEvents.filter((e) => e.dueAt <= next.elapsed);
    for (const scheduled of due) {
      if (
        next.requests.filter((r) => ['pending', 'delegated'].includes(r.status))
          .length >= 4
      )
        break;
      arrive(next, false, scheduled.eventId, scheduled.parentRequestId);
      next.scheduledEvents = next.scheduledEvents.filter(
        (e) => e !== scheduled,
      );
    }
    if (
      next.elapsed >= next.nextArrival &&
      next.elapsed < SESSION_SECONDS - 20 &&
      next.requests.filter((r) => ['pending', 'delegated'].includes(r.status))
        .length < 3
    )
      arrive(next);
  }
  if (next.game.status === 'finished') next = { ...next, paused: true };
  return next;
}
