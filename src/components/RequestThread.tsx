import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCheck,
  Clock3,
  FileCheck2,
  Forward,
  MessageSquare,
  MoreHorizontal,
  Send,
  Timer,
  Users,
} from 'lucide-react';
import type { DepartmentId, GameEffect } from '../models/game';
import type { LiveRequest, TeamMessage } from '../models/live';
import { useGameStore } from '../stores/gameStore';
import { conversations, teams } from '../data/teams';
import { getEvent } from '../data/events';
import { departmentDefinitions } from '../data/departments';
import { choiceUnavailable } from '../game/requirements';
import { teamName, timeText } from '../game/live';
import { money, millions } from '../utils/format';
import { realSeconds } from '../game/sessionTiming';
export function TeamAvatar({
  team,
  small = false,
  name,
}: {
  team: DepartmentId;
  small?: boolean;
  name?: string;
}) {
  return (
    <span
      className={`team-avatar ${small ? 'small' : ''}`}
      style={{ '--team-color': teams[team].color } as React.CSSProperties}
    >
      {name
        ? name
            .split(' ')
            .map((part) => part[0])
            .slice(0, 2)
            .join('')
        : teams[team].initials}
    </span>
  );
}
export function Message({ message }: { message: TeamMessage }) {
  const you = message.author === 'you';
  const system = message.author === 'system';
  return (
    <article
      className={`chat-message ${you ? 'from-you' : ''} ${message.kind === 'decision' ? 'decision-message' : ''}`}
    >
      {!you && (
        <TeamAvatar
          team={system ? 'finance' : (message.author as DepartmentId)}
          name={message.authorName}
          small
        />
      )}
      <div className="message-content">
        <div className="message-meta">
          <strong>
            {you
              ? 'You'
              : system
                ? 'Company secretary'
                : (message.authorName ??
                  teams[message.author as DepartmentId].lead)}
          </strong>
          <span>
            {you || system ? '' : teamName(message.author as DepartmentId)}
          </span>
          <time>{timeText(message.at)}</time>
        </div>
        <div className="bubble">{message.text}</div>
        {message.kind === 'autonomous' && (
          <small className="autonomous-label">
            <CheckCheck size={12} /> Team decision recorded
          </small>
        )}
      </div>
    </article>
  );
}
export function Deadline({ request }: { request: LiveRequest }) {
  const session = useGameStore((s) => s.session);
  const seconds = realSeconds(
    session,
    (request.status === 'delegated' ? request.resolveAt! : request.deadline) -
      session.elapsed,
  );
  return (
    <span className={`deadline ${seconds <= 12 ? 'urgent' : ''}`}>
      <Clock3 size={13} />
      {timeText(seconds)}
    </span>
  );
}
function effectText(effect: GameEffect) {
  if (effect.type === 'WORKLOAD')
    return `${teamName(effect.departmentId)} work ${effect.amount > 0 ? '+' : ''}${effect.amount}`;
  if (effect.type === 'COST') return money(effect.amount);
  if (effect.type === 'TURNOVER')
    return `${effect.amount > 0 ? '+' : ''}${millions(effect.amount)} turnover`;
  const labels = {
    ACCOUNTABILITY: 'accountability',
    MORALE: 'morale',
    EXECUTIVE_APPROVAL: 'approval',
    CUSTOMER_SATISFACTION: 'satisfaction',
    COMPLIANCE_RISK: 'risk',
  };
  return `${effect.amount > 0 ? '+' : ''}${effect.amount} ${labels[effect.type]}`;
}
export function RequestThread({
  request,
  chat = false,
  onBack,
  onOpenParent,
}: {
  request: LiveRequest;
  chat?: boolean;
  onBack: () => void;
  onOpenParent: (id: string) => void;
}) {
  const { session, respond, delegate, assess } = useGameStore();
  const [owner, setOwner] = useState<DepartmentId>('operations');
  const conversation = conversations[request.eventId];
  const event = getEvent(request.eventId);
  const messages = session.messages.filter((m) => m.requestId === request.id);
  const tail = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (chat) tail.current?.scrollIntoView({ block: 'nearest' });
  }, [messages.length, chat]);
  const pending = request.status === 'pending';
  const fallback = event.choices.find(
    (c) => c.id === conversation.defaultChoice,
  )!;
  const progress = Math.max(
    0,
    ((request.deadline - session.elapsed) /
      (request.deadline - request.createdAt)) *
      100,
  );
  return (
    <section className="request-reader" aria-label="Selected conversation">
      <div className="reader-toolbar">
        <button
          className="icon-button back-to-list"
          aria-label="Back to inbox"
          onClick={onBack}
        >
          <ArrowLeft size={18} />
        </button>
        <span>
          <MessageSquare size={16} />
          {chat ? 'Team conversation' : 'Approval conversation'}
        </span>
        <span className={`request-status ${request.status}`}>
          {pending
            ? 'Awaiting your decision'
            : request.status === 'delegated'
              ? `With ${teamName(request.delegatedTo!)}`
              : request.status === 'expired'
                ? 'Team proceeded without approval'
                : 'Decision recorded'}
        </span>
        {['pending', 'delegated'].includes(request.status) && (
          <Deadline request={request} />
        )}
      </div>
      <div className="reader-scroll">
        <div className="subject-block">
          <div className="subject-kicker">
            {event.category}{' '}
            <span>REF {request.id.split('-')[1].padStart(3, '0')}</span>
          </div>
          <h1>{conversation.subject}</h1>
          {request.parentRequestId && (
            <button
              className="parent-thread"
              onClick={() => onOpenParent(request.parentRequestId!)}
            >
              View the decision that led here <ArrowRight size={14} />
            </button>
          )}
          <div className="sender">
            <TeamAvatar team={request.departmentId} />
            <div>
              <strong>
                {request.senderName ?? teams[request.departmentId].lead}
              </strong>
              <span>
                {teams[request.departmentId].role}{' '}
                <span className="sender-to">
                  to You; {teamName(conversation.objection.team)}
                </span>
              </span>
            </div>
            <time>{timeText(request.createdAt)}</time>
          </div>
        </div>
        {pending && (
          <div
            className={`deadline-banner ${request.deadline - session.elapsed <= 12 ? 'urgent' : ''}`}
          >
            <div>
              <Timer size={17} />
              <strong>Sign-off window</strong>
              <Deadline request={request} />
              <span>
                {session.paused ? 'Clock paused' : 'Awaiting leadership'}
              </span>
            </div>
            <div className="deadline-track">
              <span style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}
        <div className={`conversation ${chat ? 'chat-style' : ''}`}>
          {messages.map((m) => (
            <Message key={m.id} message={m} />
          ))}
          {pending && session.elapsed < request.createdAt + 4 && (
            <div className="typing">
              <MoreHorizontal size={23} />
              <span>
                {teams[conversation.objection.team].lead.split(' ')[0]} is
                typing
              </span>
            </div>
          )}
          <div ref={tail} />
        </div>
        {pending && (
          <section className="response-panel">
            <div className="response-heading">
              <FileCheck2 size={18} />
              <h2>Your decision</h2>
              <span>
                Incoming {teamName(event.departmentId)} work +{event.workload}
              </span>
            </div>
            <div className="response-options">
              {event.choices.map((choice, i) => (
                <button
                  className="response-option"
                  disabled={!!choiceUnavailable(session.game, choice)}
                  key={choice.id}
                  onClick={() => respond(request.id, choice.id)}
                >
                  <span className="option-index">{i + 1}</span>
                  <span>
                    <strong>{choice.label}</strong>
                    <small>{choice.description}</small>
                    {choiceUnavailable(session.game, choice) && (
                      <small className="choice-unavailable">
                        {choiceUnavailable(session.game, choice)}
                      </small>
                    )}
                    <span className="effect-list">
                      {choice.immediateEffects.map((effect, j) => (
                        <span key={j}>{effectText(effect)}</span>
                      ))}
                      {choice.delayedEffects?.map((d, j) => (
                        <span key={`delay-${j}`}>
                          Follow-up in {d.delay} business weeks
                        </span>
                      ))}
                      {choice.followUps?.map((follow, j) => (
                        <span key={`follow-${j}`}>
                          {(follow.probability ?? 1) < 1
                            ? 'Possible follow-up'
                            : 'Follow-up'}{' '}
                          in {follow.delay}s
                        </span>
                      ))}
                    </span>
                  </span>
                  <ArrowRight size={16} />
                </button>
              ))}
            </div>
            <div className="no-response">
              <Clock3 size={15} />
              <span>
                No response: <strong>{fallback.label}</strong>. Accountability
                +3 for the missed sign-off, plus the response effects.
              </span>
            </div>
            <div className="delegate-row">
              <Forward size={17} />
              <select
                aria-label="Delegate to team"
                value={owner}
                onChange={(e) => setOwner(e.target.value as DepartmentId)}
              >
                {departmentDefinitions.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
              <button onClick={() => delegate(request.id, owner)}>
                Delegate decision
              </button>
            </div>
            <p className="action-cost">
              Accountability -5 / receiving team work +40 / decision in{' '}
              {realSeconds(session, 12)}
              seconds
            </p>
          </section>
        )}
        {request.status === 'delegated' && (
          <div className="delegated-banner">
            <Users size={22} />
            <div>
              <strong>
                {teamName(request.delegatedTo!)} owns this decision.
              </strong>
              <p>The team is checking capacity before proceeding.</p>
            </div>
            <Deadline request={request} />
          </div>
        )}
      </div>
      <div className="conversation-composer">
        <MessageSquare size={17} />
        <button
          disabled={!pending || request.extended}
          onClick={() => assess(request.id)}
        >
          <Send size={15} />
          {request.extended
            ? 'Impact assessment requested'
            : 'Request impact assessment'}
        </button>
        <span>
          {pending
            ? '+15s / team work +15 / approval -1'
            : 'Thread retained in the corporate record'}
        </span>
      </div>
    </section>
  );
}
