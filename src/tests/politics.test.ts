import { describe, expect, it } from 'vitest';
import { createLiveSession, tickLive } from '../game/live';
import { enterCareer } from '../world/engine';
import {
  attendMeeting,
  playPolitics,
  answerCEO,
  tickPolitics,
  meetingPoint,
  meetingRounds,
  ceoPoint,
} from '../world/politics';
import { parseLiveSave } from '../game/liveSave';
import { events, originalEvents } from '../data/events';
import { conversations } from '../data/teams';
const career = () => {
  const s = enterCareer(
    createLiveSession('politics-test'),
    'diplomat',
    'bdm',
    'Sam',
  );
  s.paused = false;
  return s;
};
const roundTrip = (s: ReturnType<typeof career>) =>
  parseLiveSave(
    JSON.stringify({ schemaVersion: 2, session: s, highScores: [] }),
  ).session;
describe('leadership politics expansion', () => {
  it('doubles the event catalogue with valid distinct political scenarios', () => {
    expect(originalEvents).toHaveLength(96);
    expect(events).toHaveLength(192);
    expect(new Set(events.map((e) => e.id)).size).toBe(192);
    for (const event of events) {
      expect(conversations[event.id]).toBeDefined();
      expect(
        event.choices.some(
          (c) => c.id === conversations[event.id].defaultChoice,
        ),
      ).toBe(true);
    }
    expect(events.some((e) => e.departmentId === 'bdm')).toBe(true);
    expect(events.some((e) => e.departmentId === 'specialists')).toBe(true);
  });
  it('slows mail but keeps the chat active', () => {
    const s = tickLive(career(), 60);
    expect(s.requests).toHaveLength(1);
    expect(s.messages.filter((m) => m.kind === 'chat').length).toBeGreaterThan(
      3,
    );
    expect(s.nextArrival).toBe(65);
    expect(tickLive(s, 6).requests.length).toBeGreaterThan(1);
  });
  it('requires travel and awards attendance and three evidence-based rounds once', () => {
    let s = tickLive(career(), 115);
    expect(s.world!.politics!.meeting!.office).toBe('continental');
    expect(() => attendMeeting(s)).toThrow('in person');
    s.world!.office = 'continental';
    s.world!.position = meetingPoint('continental');
    s = attendMeeting(s);
    expect(s.game.meetingBonus).toBe(25);
    expect(() => attendMeeting(s)).toThrow();
    for (let i = 0; i < 3; i++) {
      const m = s.world!.politics!.meeting!;
      s = playPolitics(s, meetingRounds[(m.theme + m.round) % 6].best);
    }
    expect(s.game.meetingBonus).toBe(70);
    expect(s.world!.politics!.meeting!.status).toBe('complete');
    expect(() => playPolitics(s, 'md')).toThrow();
    expect(roundTrip(s)).toEqual(s);
  });
  it('missed meetings and bad politics have consequences', () => {
    let s = tickLive(career(), 115);
    s.world!.office = 'continental';
    s.world!.position = meetingPoint('continental');
    s = attendMeeting(s);
    const before = s.game.metrics.accountability;
    s = playPolitics(s, 'md');
    expect(s.game.metrics.accountability).toBe(before + 4);
    expect(s.game.meetingBonus).toBe(25);
    s.elapsed = s.world!.politics!.meeting!.ends;
    tickPolitics(s);
    expect(s.world!.politics!.meeting!.status).toBe('missed');
  });
  it('Radish requires an in-person response and can be played against the MD', () => {
    let s = tickLive(career(), 90);
    expect(
      s.messages.some(
        (m) =>
          m.authorName === 'Radish / CEO Team' &&
          m.text.includes('I am part of the CEO team'),
      ),
    ).toBe(true);
    expect(() => answerCEO(s, 'ceo')).toThrow('in person');
    s.world!.position = ceoPoint;
    const favor = s.world!.mdFavor;
    s = answerCEO(s, 'ceo');
    expect(s.world!.mdFavor).toBe(favor - 8);
    expect(s.world!.politics!.ceoFavor).toBe(57);
    expect(() => answerCEO(s, 'ceo')).toThrow();
    expect(roundTrip(s)).toEqual(s);
  });
  it('adds both departments to old saves without removing existing people', () => {
    const s = tickLive(career(), 1);
    s.game.departments = s.game.departments.filter(
      (d) => !['bdm', 'specialists'].includes(d.id),
    );
    s.game.employees = s.game.employees.filter(
      (e) => !['bdm', 'specialists'].includes(e.departmentId),
    );
    s.organisation!.teams = s.organisation!.teams.filter(
      (t) => !['bdm', 'specialists'].includes(t.id),
    );
    const oldIds = s.game.employees.map((e) => e.id);
    const restored = roundTrip(s);
    expect(restored.game.departments).toHaveLength(11);
    expect(restored.organisation!.teams).toHaveLength(11);
    expect(
      oldIds.every((id) => restored.game.employees.some((e) => e.id === id)),
    ).toBe(true);
    expect(roundTrip(restored).game.employees).toHaveLength(
      restored.game.employees.length,
    );
  });
});
