import type { DepartmentId, OfficeId } from '../models/game';
import type { LiveSession } from '../models/live';
import { applyEffects } from './effects';
import { organisation } from './organisation';
import { randomFor } from './random';
import { clamp, teamLeadName, updateDepartments } from './systems';

export type SurveyMethod = 'unfiltered' | 'reframe' | 'selective' | 'invest';
export interface SurveyResponse {
  employeeId: string;
  name: string;
  departmentId: DepartmentId;
  officeId: OfficeId;
  morale: number;
  stress: number;
  engagement: number;
}
export interface StaffSurvey {
  openedAt: number;
  deadline: number;
  responses: SurveyResponse[];
  method?: SurveyMethod;
  publishedAt?: number;
  automatic?: boolean;
  reviewAt?: number;
  outcome?: string;
  reviewedAt?: number;
  followUp?: SurveyResponse[];
}
export const surveyMethods: {
  id: SurveyMethod;
  label: string;
  description: string;
}[] = [
  {
    id: 'reframe',
    label: 'Rename the middle group',
    description:
      'Count "not engaged" as "quietly committed". The chart improves; working conditions do not.',
  },
  {
    id: 'selective',
    label: 'Publish the happiest half',
    description:
      'Present a carefully selected listening cohort. Everyone else becomes an appendix nobody requested.',
  },
  {
    id: 'invest',
    label: 'Fund a recovery programme',
    description:
      'Publish the original results, remove work and fund recovery time. Improve the people before the next chart.',
  },
  {
    id: 'unfiltered',
    label: 'Release the unfiltered report',
    description:
      'Publish the actual engagement rate. No funded intervention; team mandates and personnel decisions remain yours.',
  },
];
export const surveyArrival = (seed: string) =>
  randomFor(seed, 'staff-survey-arrival').int(420, 570);
export const engagementBand = (score: number) =>
  score >= 70 ? 'Engaged' : score >= 40 ? 'Not engaged' : 'Actively disengaged';
export const mean = (
  rows: SurveyResponse[],
  key: 'morale' | 'stress' | 'engagement',
) =>
  rows.length
    ? Math.round(rows.reduce((sum, row) => sum + row[key], 0) / rows.length)
    : 0;
export const engagedPercent = (rows: SurveyResponse[]) =>
  rows.length
    ? Math.round(
        (rows.filter((r) => r.engagement >= 70).length / rows.length) * 100,
      )
    : 0;
export function surveySnapshot(s: LiveSession): SurveyResponse[] {
  return s.game.employees
    .filter((e) => ['active', 'notice', 'absent'].includes(e.status))
    .map((e) => ({
      employeeId: e.id,
      name: `${e.firstName} ${e.surname}`,
      departmentId: e.departmentId,
      officeId: e.officeId,
      morale: Math.round(e.morale),
      stress: Math.round(e.stress),
      engagement: Math.round(clamp(e.morale * 0.6 + (100 - e.stress) * 0.4)),
    }));
}
export function surveyPresentation(survey: StaffSurvey, method: SurveyMethod) {
  const all = survey.responses;
  const rows =
    method === 'selective'
      ? [...all]
          .sort(
            (a, b) =>
              b.engagement - a.engagement ||
              a.employeeId.localeCompare(b.employeeId),
          )
          .slice(0, Math.ceil(all.length / 2))
      : all;
  const positive =
    method === 'reframe'
      ? rows.filter((r) => r.engagement >= 40).length
      : rows.filter((r) => r.engagement >= 70).length;
  const percent = rows.length ? Math.round((positive / rows.length) * 100) : 0;
  const spun = method === 'reframe' || method === 'selective';
  const uplift = Math.max(0, percent - engagedPercent(all));
  return {
    percent,
    count: rows.length,
    uplift,
    headline: !all.length
      ? 'No eligible staff responses'
      : method === 'reframe'
        ? `${percent}% engaged or quietly committed`
        : method === 'selective'
          ? `${percent}% engaged in our selected listening cohort`
          : `${percent}% of staff engaged`,
    cost: method === 'invest' ? all.length * 750 : 0,
    approval: all.length
      ? method === 'invest'
        ? -4
        : spun
          ? Math.min(14, 4 + Math.round(uplift / 5))
          : -3
      : 0,
    auditRisk:
      all.length && spun
        ? Math.min(95, 30 + uplift + (method === 'selective' ? 15 : 0))
        : 0,
  };
}
function message(s: LiveSession, team: DepartmentId, text: string) {
  s.messages.push({
    id: `message-${s.messages.length}`,
    at: s.elapsed,
    departmentId: team,
    author: team,
    authorName: teamLeadName(s.game, team),
    kind: 'escalation',
    text,
  });
}
function publish(s: LiveSession, method: SurveyMethod, automatic = false) {
  const survey = s.staffSurvey!;
  const draft = surveyPresentation(survey, method);
  survey.method = method;
  survey.publishedAt = s.elapsed;
  survey.automatic = automatic;
  survey.reviewAt = s.elapsed + 180;
  applyEffects(s.game, [
    { type: 'COST', amount: draft.cost },
    { type: 'EXECUTIVE_APPROVAL', amount: draft.approval },
  ]);
  const spin = method === 'reframe' || method === 'selective';
  if (spin) applyEffects(s.game, [{ type: 'ACCOUNTABILITY', amount: -4 }]);
  const org = organisation(s);
  for (const team of org.teams)
    team.trust = clamp(team.trust + (method === 'invest' ? 6 : spin ? -6 : 2));
  if (method === 'invest') {
    for (const d of s.game.departments)
      applyEffects(s.game, [
        { type: 'WORKLOAD', departmentId: d.id, amount: -20 },
      ]);
  }
  for (const e of s.game.employees.filter((e) =>
    ['active', 'notice', 'absent'].includes(e.status),
  )) {
    e.morale = clamp(e.morale + (method === 'invest' ? 8 : spin ? -5 : 2));
    if (method === 'invest') e.stress = clamp(e.stress - 12);
  }
  const text = `${automatic ? 'Sign-off expired. HR released the original figures. ' : ''}Staff Survey published: ${draft.headline}. ${spin ? 'The presentation changed. The original responses remain on file.' : method === 'invest' ? `Recovery funding approved: GBP ${draft.cost.toLocaleString('en-GB')}.` : 'No recovery funding was authorised.'}`;
  message(s, 'hr', text);
  message(
    s,
    spin ? 'sales' : 'operations',
    spin
      ? 'Excellent. I have personally transformed engagement without needing to engage anyone. Please delegate the appendix.'
      : 'The team would like fewer resilience workshops and more time to finish the work. We will track whether anything changes.',
  );
  s.game.eventHistory.push({
    turn: s.game.turn,
    type: 'decision',
    title: 'Staff Survey: leadership sign-off',
    description: text,
  });
  updateDepartments(s.game);
}
export function publishStaffSurvey(
  input: LiveSession,
  method: SurveyMethod,
): LiveSession {
  if (!surveyMethods.some((option) => option.id === method))
    throw new Error('Unknown survey presentation.');
  if (input.game.status === 'finished') throw new Error('Career has ended.');
  if (!input.staffSurvey || input.staffSurvey.method)
    throw new Error('No survey awaits sign-off.');
  if (input.elapsed >= input.staffSurvey.deadline)
    throw new Error('Survey sign-off has expired.');
  if (
    method === 'invest' &&
    surveyPresentation(input.staffSurvey, method).cost >
      input.game.company.cash - input.game.company.pendingCosts
  )
    throw new Error('Not enough uncommitted cash for recovery funding.');
  const next = structuredClone(input);
  publish(next, method);
  return next;
}
export function tickStaffSurvey(s: LiveSession) {
  // Legacy saves beyond the launch window still receive the event while there is time for follow-up.
  if (
    !s.staffSurvey &&
    s.elapsed >= surveyArrival(s.game.seed) &&
    s.elapsed <= 850
  ) {
    s.staffSurvey = {
      openedAt: s.elapsed,
      deadline: s.elapsed + 120,
      responses: surveySnapshot(s),
    };
    message(
      s,
      'hr',
      'Staff Survey results are in. Individual morale, stress and engagement are available in Staff Survey. Leadership has two business weeks to approve the board presentation; otherwise we release the original figures.',
    );
    message(
      s,
      'finance',
      'The board wants a positive engagement story. Could we start by asking the chart to demonstrate a better attitude?',
    );
  }
  const survey = s.staffSurvey;
  if (!survey) return;
  if (!survey.method && s.elapsed >= survey.deadline)
    publish(s, 'unfiltered', true);
  if (
    !survey.method ||
    survey.reviewAt === undefined ||
    s.elapsed < survey.reviewAt ||
    survey.reviewedAt !== undefined
  )
    return;
  survey.followUp = surveySnapshot(s);
  survey.reviewedAt = s.elapsed;
  const draft = surveyPresentation(survey, survey.method);
  const challenged =
    randomFor(s.game.seed, 'staff-survey-review').value() * 100 <
    draft.auditRisk;
  if (challenged) {
    applyEffects(s.game, [
      { type: 'EXECUTIVE_APPROVAL', amount: -18 },
      { type: 'ACCOUNTABILITY', amount: 14 },
      { type: 'COMPLIANCE_RISK', amount: 8 },
    ]);
    for (const team of organisation(s).teams)
      team.trust = clamp(team.trust - 8);
    survey.outcome =
      'The original responses reached the board. Your positive presentation was challenged: board approval -18, accountability +14, compliance risk +8 and team trust -8.';
    message(
      s,
      'compliance',
      'The appendix has become the main document. Please explain why the engagement story excluded the disengagement.',
    );
  } else if (survey.method === 'reframe' || survey.method === 'selective') {
    survey.outcome =
      'The board accepted the presentation this time. Staff still remember their original answers; the morale and trust costs remain.';
    message(
      s,
      'sales',
      'The board loved my engagement strategy. I have delegated the continuing disengagement to the people experiencing it.',
    );
  } else {
    const improved =
      survey.followUp.length > 0 &&
      survey.responses.length > 0 &&
      mean(survey.followUp, 'engagement') >
        mean(survey.responses, 'engagement');
    if (improved)
      applyEffects(s.game, [{ type: 'EXECUTIVE_APPROVAL', amount: 6 }]);
    survey.outcome = improved
      ? 'The follow-up found better engagement across the current workforce. The board awarded +6 approval for measurable progress.'
      : 'The follow-up found no overall engagement improvement. Subsequent workload and staffing decisions outweighed any early gains.';
  }
  message(s, 'hr', `Staff Survey follow-up: ${survey.outcome}`);
  s.game.eventHistory.push({
    turn: s.game.turn,
    type: 'consequence',
    title: 'Staff Survey: follow-up review',
    description: survey.outcome,
  });
  updateDepartments(s.game);
}
