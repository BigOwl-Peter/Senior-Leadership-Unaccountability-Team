import type { DepartmentId } from '../models/game';
import type { LiveSession } from '../models/live';
import { applyEffects } from './effects';
import { clamp, loadRatio, teamLeadName, updateDepartments } from './systems';
import { randomFor } from './random';
import { leadershipBoasts, leadershipReplies } from '../data/leadershipChat';

export type Policy = 'balanced' | 'growth' | 'quality' | 'people';
export type CaseAction = 'support' | 'team' | 'dismiss';
export interface Organisation {
  teams: {
    id: DepartmentId;
    policy: Policy;
    trust: number;
    changes: number;
    week: number;
  }[];
  cases: {
    id: string;
    employeeId: string;
    departmentId: DepartmentId;
    topic: number;
    opened: number;
    due: number;
    status: 'open' | 'owned' | 'resolved' | 'escalated';
    action?: CaseAction;
    outcome?: string;
    supportCost?: number;
  }[];
  backlog: number;
  defects: number;
  exposure: number;
  lostAccounts: number;
  lastIncident: string;
}
export const complaints = [
  [
    'Leave request',
    'HR rejected my leave because my cover is on leave. I am their cover. We have achieved a closed loop.',
    'Approve cover and leave',
  ],
  [
    'Credit dispute',
    'My manager presented my work as theirs. They left my name in the spreadsheet properties. Shall I congratulate them publicly?',
    'Correct the record',
  ],
  [
    'Unpaid overtime',
    'The team has worked three evenings. The thank-you email arrived marked low importance.',
    'Fund recovery time',
  ],
  [
    'Promotion favouritism',
    'The promotion went to the person who organises the away day. Is competence now an optional attachment?',
    'Commission a fair review',
  ],
  [
    'Workplace conduct',
    'A colleague keeps making personal remarks in meetings. I have dates and witnesses, not just a difficult attitude.',
    'Arrange an independent investigation',
  ],
  [
    'Workload dispute',
    'Another team has renamed their backlog as our development opportunity. We would like fewer opportunities.',
    'Negotiate shared capacity',
  ],
  [
    'Expenses dispute',
    'Finance rejected the taxi home after mandatory overtime. Apparently exhaustion is not a cost centre.',
    'Approve reimbursement',
  ],
  [
    'Meeting overload',
    'We now have a daily meeting to explain why the previous daily meeting prevented delivery.',
    'Cancel recurring meetings',
  ],
  [
    'Equipment failure',
    'My laptop crashes whenever I open the strategy deck. IT says it may be exercising judgment.',
    'Fund replacement equipment',
  ],
  [
    'Pay discrepancy',
    'The new starter earns more than me for the same work. HR says salary transparency creates confusion.',
    'Review the pay band',
  ],
  [
    'Office rivalry',
    'Continental says Albion gets all the useful work. Albion says Continental gets all the useful chairs.',
    'Agree a shared allocation',
  ],
  [
    'Conflicting instructions',
    'Two directors gave opposite instructions and both asked me not to involve the other. Which career-ending option do you prefer?',
    'Publish one accountable owner',
  ],
] as const;

const supportRanges = [
  [1500, 4500],
  [250, 750],
  [2000, 6500],
  [1500, 5000],
  [5000, 15000],
  [2500, 9000],
  [50, 250],
  [0, 500],
  [900, 2400],
  [2000, 7500],
  [1000, 4000],
  [0, 750],
] as const;
export function caseSupportCost(
  session: LiveSession,
  item: Organisation['cases'][number],
) {
  if (item.supportCost !== undefined) return item.supportCost;
  // Completed legacy decisions must retain the amount actually charged.
  if (item.action === 'support') return 8000;
  const [min, max] = supportRanges[item.topic];
  return (
    randomFor(session.game.seed, `case-quote-${item.id}-${item.topic}`).int(
      min / 50,
      max / 50,
    ) * 50
  );
}

export function organisation(s: LiveSession): Organisation {
  return (s.organisation ??= {
    teams: s.game.departments.map((d) => ({
      id: d.id,
      policy: 'balanced',
      trust: 60,
      changes: 0,
      week: s.game.turn,
    })),
    cases: [],
    backlog: 0,
    defects: 5,
    exposure: 0,
    lostAccounts: 0,
    lastIncident: 'No material incidents reported.',
  });
}
function message(
  s: LiveSession,
  team: DepartmentId,
  text: string,
  authorName = teamLeadName(s.game, team),
  escalation = false,
) {
  s.messages.push({
    id: `message-${s.messages.length}`,
    at: s.elapsed,
    departmentId: team,
    author: authorName === 'You' ? 'you' : team,
    authorName,
    kind: escalation ? 'escalation' : 'chat',
    text,
  });
}
export function setTeamPolicy(
  input: LiveSession,
  id: DepartmentId,
  policy: Policy,
) {
  if (!['balanced', 'growth', 'quality', 'people'].includes(policy))
    throw new Error('Unknown team policy.');
  if (input.game.status === 'finished') throw new Error('Career has ended.');
  const s = structuredClone(input);
  const team = organisation(s).teams.find((t) => t.id === id);
  if (!team) throw new Error('Unknown team.');
  if (team.week !== s.game.turn) {
    team.week = s.game.turn;
    team.changes = 0;
  }
  if (team.policy === policy) return input;
  if (team.changes >= 1)
    throw new Error('This team already changed direction this week.');
  team.policy = policy;
  team.changes++;
  applyEffects(s.game, [{ type: 'WORKLOAD', departmentId: id, amount: 12 }]);
  message(
    s,
    id,
    `Team mandate changed to ${policy}. We will allocate work internally. The change itself adds 12 work.`,
  );
  updateDepartments(s.game);
  return s;
}
export function answerCase(input: LiveSession, id: string, action: CaseAction) {
  if (input.game.status === 'finished') throw new Error('Career has ended.');
  if (!['support', 'team', 'dismiss'].includes(action))
    throw new Error('Unknown response.');
  const s = structuredClone(input),
    org = organisation(s);
  const item = org.cases.find((c) => c.id === id && c.status === 'open');
  if (!item) throw new Error('This conversation has already been handled.');
  const supportCost = caseSupportCost(s, item);
  if (
    action === 'support' &&
    s.game.company.cash - s.game.company.pendingCosts < supportCost
  )
    throw new Error('Not enough uncommitted cash.');
  const team = org.teams.find((t) => t.id === item.departmentId)!;
  item.action = action;
  item.status = 'owned';
  item.due = Math.min(1200, s.elapsed + (action === 'dismiss' ? 90 : 45));
  if (action === 'support') {
    item.supportCost = supportCost;
    applyEffects(s.game, [
      { type: 'COST', amount: supportCost },
      { type: 'WORKLOAD', departmentId: item.departmentId, amount: 25 },
    ]);
  } else if (action === 'team') {
    applyEffects(s.game, [
      { type: 'WORKLOAD', departmentId: 'hr', amount: 35 },
    ]);
  } else team.trust = clamp(team.trust - 8);
  message(
    s,
    item.departmentId,
    `Leadership response to ${complaints[item.topic][0]}: ${action === 'support' ? `funded action, GBP ${supportCost.toLocaleString('en-GB')} and 25 team work` : action === 'team' ? 'team lead and HR own resolution; HR work +35' : 'no action authorised'}. Follow-up is on the record.`,
    'You',
  );
  updateDepartments(s.game);
  return s;
}
export function tickOrganisation(s: LiveSession) {
  const org = organisation(s);
  for (const item of org.cases.filter(
    (c) =>
      c.status === 'open' && s.elapsed >= c.opened + 25 && s.elapsed < c.due,
  )) {
    const team = org.teams.find((t) => t.id === item.departmentId)!;
    const department = s.game.departments.find(
      (d) => d.id === item.departmentId,
    )!;
    const hr = s.game.departments.find((d) => d.id === 'hr')!;
    if (
      team.trust >= 55 &&
      loadRatio(department) < 1.15 &&
      loadRatio(hr) < 1.2
    ) {
      item.status = 'owned';
      item.action = 'team';
      item.due = Math.min(1200, s.elapsed + 45);
      applyEffects(s.game, [
        { type: 'WORKLOAD', departmentId: 'hr', amount: 35 },
      ]);
      message(
        s,
        item.departmentId,
        `We have capacity to handle ${complaints[item.topic][0].toLowerCase()} within the team. HR and I own the outcome; no executive sign-off needed.`,
      );
    }
  }
  for (const item of org.cases.filter(
    (c) => ['open', 'owned'].includes(c.status) && c.due <= s.elapsed,
  )) {
    const team = org.teams.find((t) => t.id === item.departmentId)!;
    const d = s.game.departments.find((d) => d.id === item.departmentId)!;
    const employee = s.game.employees.find((e) => e.id === item.employeeId);
    const gone =
      !employee || !['active', 'notice', 'absent'].includes(employee.status);
    const success =
      !gone &&
      (item.action === 'support' ||
        (item.action === 'team' &&
          team.trust >= 45 &&
          loadRatio(d) < 1.25 &&
          loadRatio(s.game.departments.find((d) => d.id === 'hr')!) < 1.4));
    item.status = success ? 'resolved' : 'escalated';
    item.outcome = gone
      ? 'Employee has left. HR retains the unresolved case and the team has noticed.'
      : success
        ? 'Action completed. The employee confirmed the outcome; team trust +6.'
        : 'The complaint became a formal grievance. Team trust -10, HR work +45, compliance risk +5.';
    team.trust = clamp(team.trust + (success ? 6 : -10));
    if (employee && !gone) {
      employee.morale = clamp(employee.morale + (success ? 10 : -15));
      employee.stress = clamp(employee.stress + (success ? -10 : 15));
    }
    if (!success)
      applyEffects(s.game, [
        { type: 'WORKLOAD', departmentId: 'hr', amount: 45 },
        { type: 'COMPLIANCE_RISK', amount: 5 },
        { type: 'ACCOUNTABILITY', amount: 3 },
      ]);
    message(
      s,
      item.departmentId,
      `${complaints[item.topic][0]}: ${item.outcome}`,
      teamLeadName(s.game, item.departmentId),
      !success,
    );
  }
  const interval = s.elapsed < 600 ? 90 : 60;
  if (
    s.elapsed % interval === 30 &&
    s.elapsed < 1080 &&
    org.cases.filter((c) => c.status === 'open').length < 3
  ) {
    const people = s.game.employees.filter((e) => e.status === 'active');
    if (people.length) {
      const rng = randomFor(s.game.seed, `employee-chat-${org.cases.length}`);
      const employee = people[rng.int(0, people.length - 1)];
      const topic =
        (org.cases.length +
          randomFor(s.game.seed, 'complaint-deck').int(
            0,
            complaints.length - 1,
          )) %
        complaints.length;
      const item = {
        id: `case-${org.cases.length}`,
        employeeId: employee.id,
        departmentId: employee.departmentId,
        topic,
        opened: s.elapsed,
        due: s.elapsed + 100,
        status: 'open' as const,
      };
      org.cases.push(item);
      message(
        s,
        employee.departmentId,
        complaints[topic][1],
        `${employee.firstName} ${employee.surname}`,
        true,
      );
      message(
        s,
        employee.departmentId,
        `I will coordinate the team response to ${complaints[topic][0].toLowerCase()}. Please decide whether to fund action or let us handle it.`,
        teamLeadName(s.game, employee.departmentId),
      );
    }
  }
  if (s.elapsed % 45 === 20) {
    const index = Math.floor(s.elapsed / 45);
    const rng = randomFor(s.game.seed, `leadership-chat-${index}`);
    const speaker =
      s.game.departments[rng.int(0, s.game.departments.length - 1)];
    const target = [...s.game.departments]
      .filter((d) => d.id !== speaker.id)
      .sort((a, b) => loadRatio(b) - loadRatio(a))[0];
    const member = s.game.employees
      .filter((e) => e.departmentId === target.id && e.status === 'active')
      .sort((a, b) => b.stress - a.stress)[0];
    const targetContext = `${target.name} is at ${Math.round(loadRatio(target) * 100)}% workload. ${member ? `${member.firstName} has been asked for another update.` : 'Their duty desk has been asked for another update.'}`;
    message(
      s,
      speaker.id,
      `${targetContext} ${leadershipBoasts[(index + randomFor(s.game.seed, 'boast-offset').int(0, leadershipBoasts.length - 1)) % leadershipBoasts.length]}`,
    );
    message(s, target.id, leadershipReplies[index % leadershipReplies.length]);
  }
  if (s.elapsed % 120 === 50) {
    const d =
      s.game.departments[
        Math.floor(s.elapsed / 120) % s.game.departments.length
      ];
    message(
      s,
      d.id,
      org.backlog > 60
        ? 'The backlog is no longer a temporary issue. I need the leadership group to agree which promises we stop making.'
        : 'The leadership group has asked for a one-page update. The template is eleven pages. We are negotiating.',
      teamLeadName(s.game, d.id),
    );
  }
  updateDepartments(s.game);
}

export function businessWeek(s: LiveSession) {
  const org = organisation(s);
  const phase = s.elapsed < 360 ? 0 : s.elapsed < 720 ? 1 : 2;
  const load = (id: DepartmentId) =>
    loadRatio(s.game.departments.find((d) => d.id === id)!);
  for (const team of org.teams) {
    const quality = team.policy === 'quality',
      people = team.policy === 'people',
      growth = team.policy === 'growth';
    applyEffects(s.game, [
      {
        type: 'WORKLOAD',
        departmentId: team.id,
        amount: growth ? 30 : quality ? 10 : people ? -20 : -8,
      },
    ]);
    if (growth)
      applyEffects(s.game, [
        { type: 'TURNOVER', amount: 35000 },
        { type: 'COMPLIANCE_RISK', amount: 0.8 },
      ]);
    if (quality) {
      org.defects = clamp(org.defects - 2);
      org.exposure = clamp(org.exposure - 2);
      applyEffects(s.game, [{ type: 'COST', amount: 2500 }]);
    }
    for (const e of s.game.employees.filter(
      (e) => e.departmentId === team.id && e.status === 'active',
    )) {
      if (people) {
        e.stress = clamp(e.stress - 5);
        e.morale = clamp(e.morale + 2);
      }
    }
    if (people) applyEffects(s.game, [{ type: 'TURNOVER', amount: -20000 }]);
    team.trust = clamp(team.trust + (load(team.id) < 1 ? 1 : -2));
    if (team.trust < 35)
      applyEffects(s.game, [
        { type: 'WORKLOAD', departmentId: team.id, amount: 18 },
      ]);
  }
  const growthDemand =
    Math.max(0, s.game.metrics.turnover / s.game.company.initialTurnover - 1) *
    70;
  org.backlog = clamp(
    org.backlog +
      growthDemand +
      phase * 8 +
      (load('operations') - 1) * 24 +
      (load('logistics') - 1) * 18 -
      10,
    0,
    300,
  );
  org.defects = clamp(
    org.defects + Math.max(0, load('product') - 1) * 8 + phase - 1,
  );
  org.exposure = clamp(
    org.exposure +
      s.game.metrics.complianceRisk / 20 +
      phase -
      (load('compliance') < 1 ? 5 : 1),
  );
  const complaintsWork = Math.round(org.backlog / 4 + org.defects);
  applyEffects(s.game, [
    { type: 'WORKLOAD', departmentId: 'service', amount: complaintsWork },
    { type: 'WORKLOAD', departmentId: 'logistics', amount: org.backlog / 5 },
  ]);
  if (org.backlog > 65 && load('service') > 1.1) {
    org.lostAccounts++;
    applyEffects(s.game, [
      { type: 'TURNOVER', amount: -180000 },
      { type: 'CUSTOMER_SATISFACTION', amount: -4 },
    ]);
    org.lastIncident =
      'An account cancelled after repeated delivery and service failures. Annual turnover -GBP 180,000.';
    message(s, 'sales', org.lastIncident, undefined, true);
  }
  if (org.exposure >= 65) {
    org.exposure -= 30;
    applyEffects(s.game, [
      { type: 'COST', amount: 45000 },
      { type: 'ACCOUNTABILITY', amount: 8 },
      { type: 'WORKLOAD', departmentId: 'compliance', amount: 65 },
    ]);
    org.lastIncident =
      'Regulatory review opened: GBP 45,000 remediation, accountability +8 and compliance work +65.';
    message(s, 'compliance', org.lastIncident, undefined, true);
  }
  if (org.defects >= 40) {
    org.defects -= 15;
    applyEffects(s.game, [
      { type: 'COST', amount: 30000 },
      { type: 'WORKLOAD', departmentId: 'product', amount: 50 },
      { type: 'CUSTOMER_SATISFACTION', amount: -3 },
    ]);
    org.lastIncident =
      'Quality failures required a product rework: GBP 30,000, product work +50, satisfaction -3.';
    message(s, 'product', org.lastIncident, undefined, true);
  }
  if (s.elapsed === 360 || s.elapsed === 720)
    message(
      s,
      'operations',
      s.elapsed === 360
        ? 'Quarterly targets have increased. Delivery pressure is now rising across teams.'
        : 'Year-end commitments are due. Earlier promises, staff disputes and unresolved backlogs are now competing for the same capacity.',
      undefined,
      true,
    );
  updateDepartments(s.game);
}
