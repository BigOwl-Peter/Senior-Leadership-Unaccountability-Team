import { useState } from 'react';
import { ArrowLeft, MessageSquare, Users, Send } from 'lucide-react';
import { useGameStore } from '../stores/gameStore';
import { complaints } from '../game/organisation';
import { teamName, timeText } from '../game/live';
import { Message, TeamAvatar } from './RequestThread';

export function EmployeeChat() {
  const { session, answerCase } = useGameStore();
  const cases = session.organisation?.cases ?? [];
  const [selected, setSelected] = useState(cases.at(-1)?.id ?? 'leadership');
  const [query, setQuery] = useState('');
  const [mobileThread, setMobileThread] = useState(false);
  const [seen, setSeen] = useState<Record<string, string>>({});
  const item = cases.find((c) => c.id === selected);
  const personName = (id: string) => {
    const e = session.game.employees.find((e) => e.id === id);
    return e ? `${e.firstName} ${e.surname}` : 'Former employee';
  };
  const title = item ? personName(item.employeeId) : 'Leadership & teams';
  const choose = (id: string, status: string) => {
    setSelected(id);
    setSeen((s) => ({ ...s, [id]: status }));
    setMobileThread(true);
  };
  return (
    <section
      className={`messenger ${mobileThread ? 'show-thread' : ''}`}
      aria-label="Company chat"
    >
      <aside className="messenger-list">
        <header>
          <h1>
            <MessageSquare size={21} /> Chat
          </h1>
          <span>
            {cases.filter((c) => c.status === 'open').length} need a response
          </span>
        </header>
        <input
          aria-label="Search chats"
          placeholder="Search people or conversations"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="chat-conversations">
          {'leadership teams'.includes(query.toLowerCase()) && (
            <button
              className={`chat-contact ${selected === 'leadership' ? 'selected' : ''}`}
              onClick={() => choose('leadership', '')}
            >
              <span className="group-avatar">
                <Users size={22} />
              </span>
              <span>
                <strong>Leadership & teams</strong>
                <small>Group conversation</small>
              </span>
            </button>
          )}
          <h2>People</h2>
          {[...cases]
            .reverse()
            .filter((c) =>
              `${personName(c.employeeId)} ${complaints[c.topic][0]} ${teamName(c.departmentId)}`
                .toLowerCase()
                .includes(query.toLowerCase()),
            )
            .map((c) => (
              <button
                key={c.id}
                className={`chat-contact ${selected === c.id ? 'selected' : ''}`}
                onClick={() => choose(c.id, c.status)}
              >
                <TeamAvatar
                  team={c.departmentId}
                  name={personName(c.employeeId)}
                />
                <span>
                  <strong>{personName(c.employeeId)}</strong>
                  <small>{complaints[c.topic][0]}</small>
                  <small>
                    {c.outcome ??
                      (c.status === 'owned'
                        ? 'Team is following up'
                        : complaints[c.topic][1])}
                  </small>
                </span>
                {selected !== c.id && seen[c.id] !== c.status && (
                  <b className="chat-unread" aria-label="Unread conversation">
                    1
                  </b>
                )}
              </button>
            ))}
          {!cases.length && (
            <p className="chat-empty">No employee conversations yet.</p>
          )}
        </div>
      </aside>
      <section className="messenger-thread">
        <header className="messenger-heading">
          <button
            className="icon-button chat-back"
            aria-label="Back to chats"
            onClick={() => setMobileThread(false)}
          >
            <ArrowLeft size={19} />
          </button>
          {item ? (
            <TeamAvatar team={item.departmentId} name={title} />
          ) : (
            <Users size={24} />
          )}
          <div>
            <h2>{title}</h2>
            <span>
              {item
                ? `${teamName(item.departmentId)} · ${complaints[item.topic][0]}`
                : 'Company leadership group'}
            </span>
          </div>
        </header>
        <div className="messenger-history">
          {item ? (
            <article className="employee-case">
              <div className="chat-date">
                {timeText(item.opened)} · {complaints[item.topic][0]}
              </div>
              <Message
                message={{
                  id: item.id,
                  at: item.opened,
                  author: item.departmentId,
                  authorName: title,
                  departmentId: item.departmentId,
                  text: complaints[item.topic][1],
                  kind: 'chat',
                }}
              />
              {item.action && (
                <div className="chat-sent">
                  <strong>Decision record</strong>
                  <p>
                    {item.action === 'support'
                      ? `${complaints[item.topic][2]}. Funding approved: £8,000.`
                      : item.action === 'team'
                        ? 'Team lead and HR own the resolution.'
                        : 'No action authorised.'}
                  </p>
                  <small>Recorded: {item.action}</small>
                </div>
              )}
              {item.status === 'owned' && (
                <p className="chat-followup">
                  Follow-up due in {timeText(item.due - session.elapsed)}.
                </p>
              )}
              {item.outcome && (
                <div className="case-outcome">
                  <strong>{teamName(item.departmentId)} / outcome</strong>
                  <p>{item.outcome}</p>
                </div>
              )}
            </article>
          ) : (
            <div className="organisation-messages">
              {session.messages
                .filter((m) => !m.requestId)
                .slice(-60)
                .map((m) => (
                  <Message key={m.id} message={m} />
                ))}
              <p className="chat-followup">
                {session.messages.some((m) => !m.requestId)
                  ? ''
                  : 'No messages yet.'}
              </p>
            </div>
          )}
        </div>
        <footer className="chat-reply">
          {item?.status === 'open' ? (
            <>
              <div className="chat-reply-heading">
                <Send size={16} />
                <strong>Reply</strong>
                <time>{timeText(item.due - session.elapsed)} remaining</time>
              </div>
              <div className="case-actions">
                <button
                  disabled={
                    session.game.status === 'finished' ||
                    session.game.company.cash -
                      session.game.company.pendingCosts <
                      8000
                  }
                  onClick={() => answerCase(item.id, 'support')}
                >
                  {complaints[item.topic][2]} / £8,000
                </button>
                <button
                  disabled={session.game.status === 'finished'}
                  onClick={() => answerCase(item.id, 'team')}
                >
                  Team lead + HR to resolve
                </button>
                <button
                  disabled={session.game.status === 'finished'}
                  onClick={() => answerCase(item.id, 'dismiss')}
                >
                  No action
                </button>
              </div>
            </>
          ) : (
            <span>
              {item
                ? item.status === 'owned'
                  ? 'Awaiting team follow-up'
                  : 'Conversation concluded'
                : 'Leadership updates'}
            </span>
          )}
        </footer>
      </section>
    </section>
  );
}
