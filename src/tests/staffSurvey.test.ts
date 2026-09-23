import { describe, expect, it } from 'vitest';
import { createLiveSession, tickLive } from '../game/live';
import { parseLiveSave } from '../game/liveSave';
import {
  engagementBand,
  publishStaffSurvey,
  surveyArrival,
  surveyMethods,
  surveyPresentation,
  surveySnapshot,
  tickStaffSurvey,
} from '../game/staffSurvey';
import { randomFor } from '../game/random';
import { realSeconds, startShift } from '../game/sessionTiming';

function opened(seed = 'survey-test') {
  return tickLive(startShift(createLiveSession(seed), 20), surveyArrival(seed));
}
function roundTrip(session: ReturnType<typeof opened>) {
  return parseLiveSave(
    JSON.stringify({ schemaVersion: 2, session, highScores: [] }),
  ).session;
}
describe('Staff Survey', () => {
  it('arrives once between one third and one half in either appointment length', () => {
    for (const minutes of [10, 20] as const) {
      const initial = startShift(createLiveSession('survey-timing'), minutes);
      const at = surveyArrival(initial.game.seed);
      expect(at).toBeGreaterThanOrEqual(400);
      expect(at).toBeLessThanOrEqual(600);
      expect(realSeconds(initial, at)).toBeLessThanOrEqual(minutes * 30);
      const before = tickLive(initial, at - 1);
      expect(before.staffSurvey).toBeUndefined();
      const after = tickLive(before, 1);
      expect(after.staffSurvey?.openedAt).toBe(at);
      expect(tickLive(after, 1).staffSurvey).toEqual(after.staffSurvey);
      expect(roundTrip(after)).toEqual(after);
      expect(tickLive({ ...after, paused: true }, 120)).toEqual({
        ...after,
        paused: true,
      });
    }
  });
  it('calculates individual scores, includes notice and absence, excludes departed staff', () => {
    const s = createLiveSession();
    s.game.employees.forEach((e, i) => {
      e.morale = 80;
      e.stress = 30;
      e.status =
        i === 0
          ? 'resigned'
          : i === 1
            ? 'notice'
            : i === 2
              ? 'absent'
              : 'active';
    });
    const rows = surveySnapshot(s);
    expect(rows).toHaveLength(s.game.employees.length - 1);
    expect(rows.every((r) => r.engagement === 76)).toBe(true);
    expect([39, 40, 69, 70].map(engagementBand)).toEqual([
      'Actively disengaged',
      'Not engaged',
      'Not engaged',
      'Engaged',
    ]);
  });
  it('keeps raw answers immutable while applying each presentation exactly once', () => {
    for (const option of surveyMethods) {
      const s = opened();
      s.game.company.cash = 1e7;
      const original = structuredClone(s);
      const draft = surveyPresentation(s.staffSurvey!, option.id);
      const next = publishStaffSurvey(s, option.id);
      expect(s).toEqual(original);
      expect(next.staffSurvey!.responses).toEqual(s.staffSurvey!.responses);
      expect(next.game.company.pendingCosts - s.game.company.pendingCosts).toBe(
        draft.cost,
      );
      expect(roundTrip(next)).toEqual(next);
      expect(() => publishStaffSurvey(next, option.id)).toThrow('No survey');
      const future = tickLive(next, 180);
      expect(future.staffSurvey!.outcome).toBeTruthy();
      expect(future.staffSurvey!.followUp).toBeDefined();
      expect(roundTrip(future)).toEqual(future);
      expect(tickLive(roundTrip(next), 180)).toEqual(future);
    }
  });
  it('reframing and sampling improve only the reported rate', () => {
    const s = opened();
    const survey = s.staffSurvey!;
    survey.responses = survey.responses
      .slice(0, 4)
      .map((row, i) => ({ ...row, engagement: [90, 50, 45, 10][i] }));
    expect(surveyPresentation(survey, 'unfiltered').percent).toBe(25);
    expect(surveyPresentation(survey, 'reframe').percent).toBe(75);
    const selected = surveyPresentation(survey, 'selective');
    expect(selected.count).toBe(2);
    expect(selected.percent).toBe(50);
    const next = publishStaffSurvey(s, 'reframe');
    expect(next.game.employees.map((e) => e.stress)).toEqual(
      s.game.employees.map((e) => e.stress),
    );
    expect(next.staffSurvey!.responses).toEqual(survey.responses);
  });
  it('automatically releases missed sign-offs and preserves batched ticking', () => {
    const s = opened();
    const end = tickLive(s, 300);
    let stepped = s;
    for (let i = 0; i < 300; i++) stepped = tickLive(stepped, 1);
    expect(stepped).toEqual(end);
    expect(end.staffSurvey?.automatic).toBe(true);
    expect(end.staffSurvey?.method).toBe('unfiltered');
    expect(end.staffSurvey?.outcome).toBeTruthy();
    expect(roundTrip(end)).toEqual(end);
  });
  it('rejects unaffordable funding and malformed saves without changing state', () => {
    const s = opened();
    s.game.company.cash = 0;
    expect(() => publishStaffSurvey(s, 'invest')).toThrow('cash');
    expect(s.staffSurvey?.method).toBeUndefined();
    const invalid = structuredClone(s);
    invalid.staffSurvey!.responses.push(invalid.staffSurvey!.responses[0]);
    expect(() => roundTrip(invalid)).toThrow('survey');
    invalid.staffSurvey = { ...s.staffSurvey!, method: 'reframe' };
    expect(() => roundTrip(invalid)).toThrow('survey');
    delete s.staffSurvey;
    expect(roundTrip(s).staffSurvey).toBeUndefined();
  });
  it('handles no respondents without invented percentages', () => {
    const s = opened();
    s.staffSurvey!.responses = [];
    for (const option of surveyMethods) {
      const draft = surveyPresentation(s.staffSurvey!, option.id);
      expect(draft.percent).toBe(0);
      expect(draft.count).toBe(0);
      expect(draft.approval).toBe(0);
      expect(draft.headline).toBe('No eligible staff responses');
    }
  });
  it('supports both audit outcomes without applying consequences twice', () => {
    for (const challenged of [true, false]) {
      const seed = Array.from(
        { length: 500 },
        (_, i) => `survey-audit-${i}`,
      ).find((candidate) => {
        const roll = randomFor(candidate, 'staff-survey-review').value();
        return challenged ? roll < 0.1 : roll > 0.95;
      })!;
      const s = publishStaffSurvey(opened(seed), 'reframe');
      s.elapsed = s.staffSurvey!.reviewAt!;
      s.game.metrics.executiveApproval = 50;
      s.game.metrics.accountability = 30;
      tickStaffSurvey(s);
      expect(s.game.metrics.executiveApproval).toBe(challenged ? 32 : 50);
      expect(s.game.metrics.accountability).toBe(challenged ? 44 : 30);
      expect(s.staffSurvey!.outcome).toContain(
        challenged ? 'challenged' : 'accepted',
      );
      const settled = structuredClone(s);
      tickStaffSurvey(s);
      expect(s).toEqual(settled);
    }
  });
  it('allows free presentations when cash is negative', () => {
    const s = opened();
    s.game.company.cash = -100;
    expect(publishStaffSurvey(s, 'reframe').staffSurvey!.method).toBe(
      'reframe',
    );
  });
});
