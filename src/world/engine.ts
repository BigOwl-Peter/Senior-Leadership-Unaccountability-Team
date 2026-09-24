import type { DepartmentId, OfficeId } from '../models/game';
import type { LiveSession } from '../models/live';
import { applyEffects } from '../game/effects';
import { clamp } from '../game/systems';
import { randomFor } from '../game/random';
import { createLogistics, tickLogistics } from './logistics';
import { createPolitics, tickPolitics } from './politics';
import {
  characters,
  mdName,
  offices,
  scriptFor,
  type Avatar,
  type WorldChoice,
  type WorldCase,
} from './model';
export function enterCareer(
  s: LiveSession,
  avatar: Avatar,
  team: DepartmentId,
  name: string,
) {
  const character = characters.find((c) => c.id === avatar);
  if (!character || !s.game.departments.some((d) => d.id === team))
    throw new Error('Choose a character and team.');
  s.world = {
    logistics: createLogistics(),
    politics: createPolitics(),
    avatar,
    name: name.trim().slice(0, 40) || character.name,
    team,
    office: 'albion',
    position: { x: 640, y: 704 },
    corruption: { albion: 24, continental: 28 },
    mdFavor: 55,
    nextLocal: 50,
    nextMD: 30,
    serial: 0,
    cases: [],
    visits: { albion: 1, continental: 0 },
    log: [],
  };
  s.game.metrics.accountability = 15;
  s.game.continuous = true;
  s.durationMinutes = 20;
  s.nextArrival = 65;
  s.game.offices = [
    { id: 'albion', name: 'London / UK', location: 'United Kingdom' },
    { id: 'continental', name: 'Cape Town / SA', location: 'South Africa' },
  ];
  addCase(s, 'local', 'albion', team);
  log(
    s,
    'Appointment accepted. Keep both offices functioning. Leave with zero accountability.',
  );
  return s;
}
function log(s: LiveSession, text: string) {
  s.world!.log = [...s.world!.log, { at: s.elapsed, text }].slice(-40);
}
function addCase(
  s: LiveSession,
  kind: 'local' | 'md',
  office: OfficeId,
  team?: DepartmentId,
) {
  const w = s.world!;
  const people = s.game.employees.filter(
    (e) =>
      e.officeId === office &&
      ['active', 'notice', 'absent'].includes(e.status),
  );
  if (!people.length && kind === 'local') return;
  const rng = randomFor(s.game.seed, `world-case-${w.serial}`);
  const employee =
    people.find((e) => e.departmentId === team) ??
    people[rng.int(0, Math.max(0, people.length - 1))];
  const item: WorldCase = {
    id: `world-${w.serial++}`,
    kind,
    template: (w.serial - 1) % 9,
    office,
    employeeId: kind === 'md' ? 'md' : employee!.id,
    departmentId: team ?? employee?.departmentId ?? 'operations',
    opened: s.elapsed,
    due: s.elapsed + (kind === 'md' ? 90 : 150),
  };
  w.cases = [...w.cases, item].slice(-50);
  const title = scriptFor(item)[0];
  log(
    s,
    `${kind === 'md' ? 'MD directive' : offices[office].short}: ${title}.`,
  );
  s.messages.push({
    id: `message-${s.messages.length}`,
    at: s.elapsed,
    departmentId: item.departmentId,
    author: item.departmentId,
    authorName:
      kind === 'md' ? mdName : `${employee!.firstName} ${employee!.surname}`,
    kind: 'escalation',
    text: `${title}. ${kind === 'md' ? 'The MD is calling. Answer the directive on your office HUD.' : `Find me on the ${offices[office].name} office floor. We need a decision.`}`,
  });
}
export function tickWorld(s: LiveSession) {
  const w = s.world;
  if (!w) return;
  tickPolitics(s);
  tickLogistics(s);
  if (s.game.status === 'finished') return;
  if (w.flight && s.elapsed >= w.flight.arrives) {
    w.office = w.flight.to;
    w.position = { x: 640, y: 704 };
    w.visits[w.office]++;
    w.flight = undefined;
    log(
      s,
      `Arrived in ${offices[w.office].name}. Your inbox travelled faster.`,
    );
  }
  for (const item of w.cases.filter((c) => !c.choice && c.due <= s.elapsed)) {
    item.choice = 'expired';
    item.outcome =
      item.kind === 'md'
        ? 'The MD named you as owner. Accountability +8; favour -10.'
        : 'The team improvised. Local corruption +7; accountability +3.';
    applyEffects(s.game, [
      { type: 'ACCOUNTABILITY', amount: item.kind === 'md' ? 8 : 3 },
    ]);
    w.corruption[item.office] = clamp(
      w.corruption[item.office] + (item.kind === 'md' ? 4 : 7),
    );
    if (item.kind === 'md') w.mdFavor = clamp(w.mdFavor - 10);
    log(s, `${scriptFor(item)[0]}: ${item.outcome}`);
  }
  if (s.elapsed % 60 === 0) {
    for (const office of ['albion', 'continental'] as const) {
      w.corruption[office] = clamp(
        w.corruption[office] + (office === w.office && !w.flight ? 1 : 3),
      );
      if (w.corruption[office] >= 70) {
        applyEffects(s.game, [
          { type: 'ACCOUNTABILITY', amount: 4 },
          { type: 'COMPLIANCE_RISK', amount: 3 },
        ]);
        log(
          s,
          `${offices[office].name}: corruption triggered an audit. Accountability +4.`,
        );
      }
    }
    if (w.mdFavor < 20)
      applyEffects(s.game, [{ type: 'ACCOUNTABILITY', amount: 3 }]);
  }
  if (s.elapsed >= w.nextLocal) {
    const office =
      Math.floor(s.elapsed / 75) % 2 === 0 ? 'continental' : 'albion';
    if (
      w.cases.filter(
        (c) => !c.choice && c.kind === 'local' && c.office === office,
      ).length < 3
    )
      addCase(s, 'local', office);
    w.nextLocal = s.elapsed + 75;
  }
  if (s.elapsed >= w.nextMD) {
    addCase(s, 'md', w.office);
    w.nextMD = s.elapsed + 115;
  }
}
export function checkCareerFailure(s: LiveSession) {
  if (!s.game.continuous) return false;
  if (s.game.metrics.accountability >= 100 || s.game.metrics.turnover <= 0) {
    s.game.status = 'finished';
    s.paused = true;
  }
  return s.game.status === 'finished';
}
export function worldChoiceEffects(
  s: LiveSession,
  item: WorldCase,
  choice: WorldChoice,
) {
  const w = s.world!,
    ownsTeam = item.departmentId === w.team;
  return choice === 'comply'
    ? {
        corruption: 12,
        accountability: -5,
        favor: 10,
        cost: w.avatar === 'fixer' ? 1500 : 3000,
        morale: -3,
      }
    : choice === 'document'
      ? {
          corruption: -2,
          accountability:
            -6 - (w.avatar === 'auditor' ? 2 : 0) - (ownsTeam ? 2 : 0),
          favor: -5,
          cost: 0,
          morale: 1,
        }
      : {
          corruption: -14 - (w.avatar === 'operator' ? 4 : 0),
          accountability: 3,
          favor: w.avatar === 'diplomat' ? -5 : -12,
          cost: 6000,
          morale: 6,
        };
}
export function resolveWorldCase(
  input: LiveSession,
  id: string,
  choice: WorldChoice,
) {
  if (
    !['comply', 'document', 'refuse'].includes(choice) ||
    input.game.status === 'finished'
  )
    throw new Error('This decision is unavailable.');
  const item = input.world?.cases.find((c) => c.id === id && !c.choice);
  if (!item) throw new Error('That matter is already settled.');
  if (
    item.kind === 'local' &&
    (input.world!.flight || item.office !== input.world!.office)
  )
    throw new Error('You need to visit that office.');
  const effect = worldChoiceEffects(input, item, choice);
  if (
    effect.cost > 0 &&
    input.game.company.cash - input.game.company.pendingCosts < effect.cost
  )
    throw new Error('Not enough uncommitted cash.');
  const s = structuredClone(input),
    w = s.world!,
    current = w.cases.find((c) => c.id === id)!;
  current.choice = choice;
  w.corruption[item.office] = clamp(
    w.corruption[item.office] + effect.corruption,
  );
  w.mdFavor = clamp(w.mdFavor + effect.favor);
  applyEffects(s.game, [
    { type: 'COST', amount: effect.cost },
    { type: 'ACCOUNTABILITY', amount: effect.accountability },
    { type: 'EXECUTIVE_APPROVAL', amount: Math.round(effect.favor / 2) },
  ]);
  for (const e of s.game.employees.filter(
    (e) =>
      e.officeId === item.office &&
      e.departmentId === item.departmentId &&
      ['active', 'notice'].includes(e.status),
  ))
    e.morale = clamp(e.morale + effect.morale);
  current.outcome =
    choice === 'document'
      ? 'The signed instruction now names somebody else. A paper trail is a beautiful thing.'
      : choice === 'comply'
        ? 'The MD approves. The office acquired another problem nobody officially owns.'
        : 'The team gets practical help. The MD has taken your competence personally.';
  log(s, `${scriptFor(item)[0]}: ${current.outcome}`);
  s.game.eventHistory.push({
    turn: s.game.turn,
    type: 'decision',
    title: scriptFor(item)[0],
    description: current.outcome,
  });
  checkCareerFailure(s);
  return s;
}
export function takeFlight(input: LiveSession) {
  const w = input.world;
  if (!w || w.flight || input.game.status === 'finished')
    throw new Error('No flight available.');
  if (Math.hypot(w.position.x - 1056, w.position.y - 720) > 115)
    throw new Error('Walk to the travel desk first.');
  if (input.game.company.cash - input.game.company.pendingCosts < 2500)
    throw new Error('Not enough cash for the flight.');
  const s = structuredClone(input);
  s.world!.flight = {
    to: w.office === 'albion' ? 'continental' : 'albion',
    arrives: s.elapsed + 30,
  };
  applyEffects(s.game, [{ type: 'COST', amount: 2500 }]);
  log(
    s,
    `Departing for ${offices[s.world!.flight.to].name}. GBP 2,500 charged to executive mobility.`,
  );
  return s;
}
