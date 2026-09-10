import { describe, expect, it } from 'vitest';
import { createLiveSession, tickLive } from '../game/live';
import { officeSummaries } from '../game/officeSummary';
import { events, getEvent } from '../data/events';
import { careerEmails } from '../data/careerEmails';
import { conversations } from '../data/teams';
import { parseLiveSave } from '../game/liveSave';

describe('office visibility and expanded content', () => {
  it('allocates the exact group turnover and identifies actual workforce movements', () => {
    const s = createLiveSession('office-visibility');
    const employee = s.game.employees[0];
    employee.status = 'notice';
    employee.departureTurn = 3;
    const second = s.game.employees.find(
      (e) => e.officeId === employee.officeId && e.id !== employee.id,
    )!;
    second.status = 'resigned';
    const offices = officeSummaries(s.game);
    expect(offices.reduce((n, o) => n + o.turnover, 0)).toBe(
      s.game.metrics.turnover,
    );
    expect(offices.reduce((n, o) => n + o.headcount, 0)).toBe(60);
    expect(offices.find((o) => o.id === employee.officeId)!.notice).toBe(1);
    expect(offices.find((o) => o.id === employee.officeId)!.left).toBe(1);
    s.game.employees.forEach((e) => {
      e.status = 'resigned';
    });
    expect(
      officeSummaries(s.game).every((o) => Number.isFinite(o.turnover)),
    ).toBe(true);
  });
  it('triples standard emails with unique scenarios, choices and valid chains', () => {
    expect(events.filter((e) => !e.followUpOnly)).toHaveLength(81);
    expect(careerEmails).toHaveLength(54);
    expect(new Set(events.map((e) => e.id)).size).toBe(events.length);
    expect(new Set(events.map((e) => e.title)).size).toBe(events.length);
    for (const event of careerEmails) {
      expect(event.choices).toHaveLength(3);
      expect(
        event.choices.some(
          (c) => c.id === conversations[event.id].defaultChoice,
        ),
      ).toBe(true);
      for (const choice of event.choices)
        for (const follow of choice.followUps ?? [])
          expect(getEvent(follow.eventId).followUpOnly).toBe(true);
    }
  });
  it('a full career does not exhaust the standard deck and leadership comments use current staff', () => {
    const end = tickLive(
      { ...createLiveSession('variety-check'), paused: false },
      1200,
    );
    const standard = end.requests.filter(
      (r) => !getEvent(r.eventId).followUpOnly,
    );
    expect(standard.length).toBeGreaterThan(20);
    expect(new Set(standard.map((r) => r.eventId)).size).toBe(standard.length);
    expect(
      end.messages.filter((m) => m.text.includes('workload.')).length,
    ).toBeGreaterThan(20);
    end.chatSeenThrough = end.messages.length;
    expect(
      parseLiveSave(
        JSON.stringify({ schemaVersion: 2, session: end, highScores: [] }),
      ).session.chatSeenThrough,
    ).toBe(end.messages.length);
  });
});
