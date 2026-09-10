import type { DepartmentId, GameState } from './game';
export interface LiveRequest {
  id: string;
  eventId: string;
  departmentId: DepartmentId;
  createdAt: number;
  deadline: number;
  originalDeadline?: number;
  status: 'pending' | 'delegated' | 'resolved' | 'expired';
  choiceId?: string;
  delegatedTo?: DepartmentId;
  resolveAt?: number;
  extended: boolean;
  reminded: boolean;
  read: boolean;
  parentRequestId?: string;
  senderName?: string;
}
export interface TeamMessage {
  id: string;
  requestId?: string;
  departmentId: DepartmentId;
  author: DepartmentId | 'you' | 'system';
  text: string;
  at: number;
  kind: 'request' | 'chat' | 'decision' | 'escalation' | 'autonomous';
  authorName?: string;
}
export interface LiveSession {
  chatSeenThrough?: number;
  organisation?: import('../game/organisation').Organisation;
  game: GameState;
  elapsed: number;
  paused: boolean;
  speed: 1 | 2 | 4;
  requests: LiveRequest[];
  messages: TeamMessage[];
  nextArrival: number;
  scheduledEvents: {
    eventId: string;
    dueAt: number;
    parentRequestId: string;
  }[];
}
