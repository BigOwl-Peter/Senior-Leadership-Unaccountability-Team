import { create } from 'zustand';
import {
  answerCase,
  setTeamPolicy,
  type Policy,
  type CaseAction,
} from '../game/organisation';
import type { DepartmentId, HighScore } from '../models/game';
import type { LiveSession } from '../models/live';
import {
  createLiveSession,
  delegateLive,
  requestAssessment,
  respondLive,
  tickLive,
  manageLivePersonnel,
} from '../game/live';
import type { PersonnelAction } from '../game/personnel';
import { parseLiveSave } from '../game/liveSave';
import { leadershipScore } from '../game/systems';
const KEY = 'slut-live-save-v2';
function restore() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const save = parseLiveSave(raw);
      save.session.paused = true;
      return {
        session: save.session,
        highScores: save.highScores,
        notice: 'Session restored and paused.',
      };
    }
  } catch {
    return {
      session: createLiveSession(),
      highScores: [] as HighScore[],
      notice:
        'The saved session could not be loaded. A fresh appointment is ready.',
    };
  }
  return {
    session: createLiveSession(),
    highScores: [] as HighScore[],
    notice: '',
  };
}
function persist(session: LiveSession, highScores: HighScore[]) {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({ schemaVersion: 2, session, highScores }),
    );
    return '';
  } catch {
    return 'Browser storage is unavailable. Progress will not survive a reload.';
  }
}
interface Store {
  markChatSeen: () => void;
  answerCase: (id: string, action: CaseAction) => void;
  setTeamPolicy: (id: DepartmentId, policy: Policy) => void;
  session: LiveSession;
  highScores: HighScore[];
  notice: string;
  tick: (seconds: number) => void;
  setPaused: (paused: boolean) => void;
  setSpeed: (speed: 1 | 2 | 4) => void;
  respond: (id: string, choice: string) => void;
  delegate: (id: string, team: DepartmentId) => void;
  assess: (id: string) => void;
  markRead: (id: string) => void;
  transfer: (id: string) => void;
  manage: (action: PersonnelAction) => void;
  restart: (seed: string) => void;
}
export const useGameStore = create<Store>((set, get) => {
  function update(action: (session: LiveSession) => LiveSession) {
    try {
      const previous = get().session;
      const session = action(previous);
      if (previous === session) return;
      let highScores = get().highScores;
      if (
        previous.game.status !== 'finished' &&
        session.game.status === 'finished'
      )
        highScores = [
          ...highScores,
          {
            seed: session.game.seed,
            score: leadershipScore(session.game),
            turnover: session.game.metrics.turnover,
            date: new Date().toISOString(),
          },
        ]
          .sort((a, b) => b.score - a.score)
          .slice(0, 10);
      set({ session, highScores, notice: persist(session, highScores) });
    } catch (e) {
      set({ notice: (e as Error).message });
    }
  }
  return {
    ...restore(),
    markChatSeen: () =>
      update((s) =>
        s.chatSeenThrough === s.messages.length
          ? s
          : { ...s, chatSeenThrough: s.messages.length },
      ),
    answerCase: (id, action) => update((s) => answerCase(s, id, action)),
    setTeamPolicy: (id, policy) => update((s) => setTeamPolicy(s, id, policy)),
    tick: (seconds) => update((s) => tickLive(s, seconds)),
    setPaused: (paused) =>
      update((s) => {
        const nextPaused = s.game.status === 'finished' || paused;
        return s.paused === nextPaused ? s : { ...s, paused: nextPaused };
      }),
    setSpeed: (speed) => update((s) => ({ ...s, speed })),
    respond: (id, choice) => update((s) => respondLive(s, id, choice)),
    delegate: (id, team) => update((s) => delegateLive(s, id, team)),
    assess: (id) => update((s) => requestAssessment(s, id)),
    markRead: (id) => {
      if (get().session.requests.find((r) => r.id === id)?.read) return;
      update((s) => ({
        ...s,
        requests: s.requests.map((r) =>
          r.id === id ? { ...r, read: true } : r,
        ),
      }));
    },
    transfer: (id) =>
      update((s) => {
        const employee = s.game.employees.find((e) => e.id === id);
        if (!employee) throw new Error('Employee not found.');
        return manageLivePersonnel(s, {
          type: 'transfer',
          employeeId: id,
          officeId: employee.officeId === 'albion' ? 'continental' : 'albion',
          departmentId: employee.departmentId,
        });
      }),
    manage: (action) => update((s) => manageLivePersonnel(s, action)),
    restart: (seed) => {
      const session = createLiveSession(seed);
      set({ session, notice: persist(session, get().highScores) });
    },
  };
});
