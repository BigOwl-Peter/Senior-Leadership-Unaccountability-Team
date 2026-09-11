import { useEffect, useRef, useState } from 'react';
import {
  Activity,
  Archive,
  ArrowRight,
  Building2,
  ChartNoAxesCombined,
  CheckCheck,
  ChevronDown,
  ClipboardCheck,
  Forward,
  Inbox,
  Mail,
  MessageSquare,
  Pause,
  Play,
  RotateCcw,
  Search,
  Send,
  ShieldCheck,
  Timer,
  Users,
  X,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { DepartmentId } from '../models/game';
import { useGameStore } from '../stores/gameStore';
import { useLiveClock } from '../hooks/useLiveClock';
import { SESSION_SECONDS, teamName, timeText } from '../game/live';
import { conversations, teams, teamPriorities } from '../data/teams';
import { departmentDefinitions } from '../data/departments';
import { loadRatio, teamLeadName } from '../game/systems';
import { millions, number } from '../utils/format';
import {
  Deadline,
  Message,
  RequestThread,
  TeamAvatar,
} from '../components/RequestThread';
import { CompanyViews } from '../components/CompanyViews';
import { useGameAudio } from '../hooks/useGameAudio';
import { OfficeOverview } from '../components/OfficeOverview';
import { HowToPlay } from '../components/HowToPlay';
import { realSeconds } from '../game/sessionTiming';
import { EmployeeChat, TeamMandate } from '../components/OrganisationViews';
type View = 'Mail' | 'Chat' | 'Teams' | 'People' | 'Board' | 'Reports';
type Folder =
  | 'Inbox'
  | 'Awaiting approval'
  | 'Delegated'
  | 'Decision record'
  | 'Missed deadlines';
const views: { name: View; icon: LucideIcon }[] = [
  { name: 'Mail', icon: Mail },
  { name: 'Chat', icon: MessageSquare },
  { name: 'Teams', icon: Users },
  { name: 'People', icon: Building2 },
  { name: 'Board', icon: ClipboardCheck },
  { name: 'Reports', icon: ChartNoAxesCombined },
];
const folders: { name: Folder; icon: LucideIcon }[] = [
  { name: 'Inbox', icon: Inbox },
  { name: 'Awaiting approval', icon: ClipboardCheck },
  { name: 'Delegated', icon: Forward },
  { name: 'Decision record', icon: Send },
  { name: 'Missed deadlines', icon: Archive },
];
export default function App() {
  const [splash, setSplash] = useState(true);
  const [entering, setEntering] = useState(false);
  const { muted, toggleMusic, audioError } = useGameAudio();
  const transition = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (transition.current) clearTimeout(transition.current);
    },
    [],
  );
  const enter = () => {
    if (entering) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setSplash(false);
      return;
    }
    setEntering(true);
    transition.current = setTimeout(
      () => {
        setSplash(false);
        setEntering(false);
      },
      matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 650,
    );
  };
  const musicButton = (
    <>
      <button
        className="icon-button"
        onClick={toggleMusic}
        title={muted ? 'Unmute music' : 'Mute music'}
        aria-label={muted ? 'Unmute music' : 'Mute music'}
        aria-pressed={muted}
      >
        {muted ? <VolumeX size={19} /> : <Volume2 size={19} />}
      </button>
      {audioError && (
        <span className="audio-warning" role="status">
          {audioError}
        </span>
      )}
    </>
  );
  if (splash)
    return (
      <main className={`splash-screen ${entering ? 'splash-entering' : ''}`}>
        <button
          className="splash-enter"
          aria-label="Enter executive workspace"
          onClick={enter}
          disabled={entering}
        >
          <img
            className="splash-wallpaper"
            src={`${import.meta.env.BASE_URL}media/SLUT Team wallpaper.png`}
            alt="S.L.U.T. Senior Leadership Unaccountability Team executive office"
          />
          <span className="splash-action">
            <Play size={20} /> Enter executive workspace
          </span>
        </button>
        <div className="splash-music">
          {musicButton}
          <HowToPlay />
          <button
            className="restart-career"
            onClick={() => {
              if (
                window.confirm(
                  'Restart Career? Current progress will be replaced. Completed scores are retained.',
                )
              ) {
                const store = useGameStore.getState();
                store.restart(store.session.game.seed);
              }
            }}
          >
            <RotateCcw size={15} />
            Restart Career
          </button>
        </div>
      </main>
    );
  return (
    <Workspace
      musicButton={musicButton}
      onHome={() => {
        useGameStore.getState().setPaused(true);
        setSplash(true);
      }}
    />
  );
}

function Workspace({
  musicButton,
  onHome,
}: {
  musicButton: React.ReactNode;
  onHome: () => void;
}) {
  useLiveClock();
  const { session, notice, setPaused, setSpeed, restart, markRead } =
    useGameStore();
  const [view, setView] = useState<View>('Mail');
  const [profileId, setProfileId] = useState<string | null>(null);
  const [folder, setFolder] = useState<Folder>('Inbox');
  const [selected, setSelected] = useState('request-0');
  const [query, setQuery] = useState('');
  const [channel, setChannel] = useState<DepartmentId>('operations');
  const [mobileReader, setMobileReader] = useState(false);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [seed, setSeed] = useState(session.game.seed);
  const dialog = useRef<HTMLDialogElement>(null);
  const shiftDialog = useRef<HTMLDialogElement>(null);
  const game = session.game;
  const m = game.metrics;
  const finished = game.status === 'finished';
  const awaiting = session.requests.filter((r) => r.status === 'pending');
  const delegated = session.requests.filter((r) => r.status === 'delegated');
  const filtered = [...session.requests].reverse().filter((r) => {
    const match =
      folder === 'Inbox' ||
      (folder === 'Awaiting approval' && r.status === 'pending') ||
      (folder === 'Delegated' && r.status === 'delegated') ||
      (folder === 'Decision record' && r.status === 'resolved') ||
      (folder === 'Missed deadlines' && r.status === 'expired');
    return (
      match &&
      `${conversations[r.eventId].subject} ${r.senderName ?? teams[r.departmentId].lead} ${teamName(r.departmentId)}`
        .toLowerCase()
        .includes(query.toLowerCase())
    );
  });
  const request = filtered.find((r) => r.id === selected) ?? filtered[0];
  const unread = session.requests.filter((r) => !r.read).length;
  const chatUnread = session.messages
    .slice(session.chatSeenThrough ?? 0)
    .filter((m) => !m.requestId && m.author !== 'you').length;
  const notifications = session.messages
    .filter(
      (message) =>
        view !== 'Chat' &&
        message.at > 0 &&
        session.elapsed - message.at < 14 &&
        message.author !== 'you' &&
        !dismissed.includes(message.id) &&
        ['request', 'escalation', 'decision'].includes(message.kind),
    )
    .slice(-2);
  const openRequest = (id: string) => {
    setView('Mail');
    setFolder('Inbox');
    setQuery('');
    setSelected(id);
    setMobileReader(true);
    markRead(id);
  };
  useEffect(() => {
    if (finished) setView('Board');
    else {
      setView('Mail');
      setFolder('Inbox');
      setQuery('');
      setSelected('request-0');
      setDismissed([]);
      setMobileReader(false);
    }
  }, [finished]);
  return (
    <div className="live-app">
      <a className="skip-link" href="#workspace">
        Skip to workspace
      </a>
      <header className="suite-bar">
        <div className="suite-brand">
          <button
            className="suite-logo"
            onClick={onHome}
            title="Pause and return to splash screen"
            aria-label="Pause and return to splash screen"
          >
            <img
              src={`${import.meta.env.BASE_URL}media/SLUT Logo.png`}
              alt="S.L.U.T. logo"
            />
          </button>
          <strong>S.L.U.T.</strong>
          <span className="suite-name">
            Senior Leadership Unaccountability Team
          </span>
        </div>
        <div className="suite-right">
          <HowToPlay />
          <button
            className="restart-career"
            onClick={() => {
              setPaused(true);
              setSeed(game.seed);
              dialog.current?.showModal();
            }}
          >
            <RotateCcw size={15} />
            Restart Career
          </button>
          <span className="confidential">OMNIFORM / INTERNAL</span>
          <span className="executive-avatar">SL</span>
        </div>
      </header>
      <div className="live-toolbar">
        <div className="workspace-name">
          <Mail size={19} />
          <strong>Executive workspace</strong>
          <span className="live-version">LIVE</span>
        </div>
        <div className="clock-controls">
          <span className={`availability ${session.paused ? 'paused' : ''}`}>
            <i />
            {finished
              ? 'Appointment ended'
              : session.paused
                ? 'Away / paused'
                : 'Available'}
          </span>
          <span className="session-clock" aria-label="Session time remaining">
            <Timer size={17} />
            <b>
              {timeText(
                realSeconds(session, SESSION_SECONDS - session.elapsed),
              )}
            </b>
            <small>remaining</small>
          </span>
          <div className="speed-control" aria-label="Simulation speed">
            {([1, 2, 4] as const).map((speed) => (
              <button
                key={speed}
                aria-pressed={session.speed === speed}
                disabled={finished}
                onClick={() => setSpeed(speed)}
              >
                {speed}x
              </button>
            ))}
          </div>
          <button
            className={`clock-button ${session.paused ? 'primary' : ''}`}
            onClick={() => {
              if (session.paused && session.elapsed === 0)
                shiftDialog.current?.showModal();
              else setPaused(!session.paused);
            }}
            disabled={finished}
          >
            {session.paused ? <Play size={15} /> : <Pause size={15} />}
            {session.paused
              ? session.elapsed
                ? 'Resume'
                : 'Start shift'
              : 'Pause'}
          </button>
          {musicButton}
          <button
            className="icon-button"
            title="New appointment"
            aria-label="New appointment"
            onClick={() => {
              setPaused(true);
              setSeed(game.seed);
              dialog.current?.showModal();
            }}
          >
            <RotateCcw size={17} />
          </button>
        </div>
      </div>
      <section className="live-metrics" aria-label="Live company metrics">
        <div>
          <span>Annualised turnover</span>
          <strong>{millions(m.turnover)}</strong>
          <small className="growth">
            {((m.turnover / game.company.initialTurnover - 1) * 100).toFixed(1)}
            %
          </small>
        </div>
        <div>
          <span>Accountability</span>
          <strong>
            {number(m.accountability)}
            <small>/100</small>
          </strong>
        </div>
        <div>
          <span>Board approval</span>
          <strong>
            {number(m.executiveApproval)}
            <small>/100</small>
          </strong>
        </div>
        <div>
          <span>Customer satisfaction</span>
          <strong>
            {number(m.customerSatisfaction)}
            <small>/100</small>
          </strong>
        </div>
        <div className="approval-metric">
          <span>Needs your sign-off</span>
          <strong>{awaiting.length}</strong>
          <span className="waiting-text">{delegated.length} with teams</span>
        </div>
        <div className="business-week">
          <span>Business week</span>
          <strong>
            {String(game.turn).padStart(2, '0')}
            <small>/20</small>
          </strong>
          <div className="week-track">
            <span
              style={{ width: `${((session.elapsed % 60) / 60) * 100}%` }}
            />
          </div>
        </div>
      </section>
      {notice && (
        <div className="storage-notice" role="status">
          {notice}
        </div>
      )}
      <OfficeOverview onOpen={() => setView('People')} />
      <div className="desktop-body">
        <nav className="app-rail" aria-label="Applications">
          {views.map(({ name, icon: Icon }) => (
            <button
              key={name}
              aria-current={view === name ? 'page' : undefined}
              aria-label={name}
              onClick={() => {
                setView(name);
                setProfileId(null);
                setMobileReader(false);
              }}
            >
              <span>
                <Icon size={21} />
                {name === 'Mail' && unread > 0 && <b>{unread}</b>}
                {name === 'Chat' && chatUnread > 0 && (
                  <b aria-label={`${chatUnread} new chat notifications`}>
                    {chatUnread > 99 ? '99+' : chatUnread}
                  </b>
                )}
              </span>
              <small>{name}</small>
            </button>
          ))}
          <span className="rail-bottom">
            <ShieldCheck size={19} />
          </span>
        </nav>
        <aside
          className={`folder-sidebar ${view === 'Chat' ? 'chat-sidebar-hidden' : ''}`}
        >
          <div className="account-name">
            <span className="account-avatar">SL</span>
            <div>
              <strong>Senior Leadership</strong>
              <small>leadership@omniform.local</small>
            </div>
          </div>
          <div className="sidebar-label">
            FAVOURITES <ChevronDown size={13} />
          </div>
          {folders.map(({ name, icon: Icon }) => (
            <button
              key={name}
              className={`folder ${folder === name && (view === 'Mail' || view === 'Chat') ? 'active' : ''}`}
              onClick={() => {
                setFolder(name);
                setView('Mail');
                setMobileReader(false);
                setQuery('');
              }}
            >
              <Icon size={16} />
              <span>{name}</span>
              <b>
                {name === 'Inbox'
                  ? session.requests.length
                  : name === 'Awaiting approval'
                    ? awaiting.length
                    : name === 'Delegated'
                      ? delegated.length
                      : name === 'Decision record'
                        ? session.requests.filter(
                            (r) => r.status === 'resolved',
                          ).length
                        : session.requests.filter((r) => r.status === 'expired')
                            .length}
              </b>
            </button>
          ))}
          <div className="sidebar-label team-label">
            YOUR TEAMS <span>9</span>
          </div>
          {departmentDefinitions.map((d) => (
            <button
              key={d.id}
              className={`team-link ${view === 'Teams' && channel === d.id ? 'active' : ''}`}
              onClick={() => {
                setChannel(d.id);
                setView('Teams');
              }}
            >
              <span style={{ background: teams[d.id].color }}>
                {d.name.slice(0, 2)}
              </span>
              {d.name}
              {awaiting.some((r) => r.departmentId === d.id) && (
                <i aria-label="Awaiting approval" />
              )}
            </button>
          ))}
          <div className="sidebar-note">
            <ShieldCheck size={16} />
            <span>Every decision leaves a paper trail.</span>
          </div>
        </aside>
        <main
          id="workspace"
          className={`workspace-view ${mobileReader ? 'show-reader' : ''}`}
        >
          {view === 'Chat' && <EmployeeChat />}
          {view === 'Mail' && (
            <>
              <section className="mail-list" aria-label="Inbox">
                <div className="mail-list-heading">
                  <h2>{folder}</h2>
                  <span>{filtered.length}</span>
                  <Mail size={18} />
                </div>
                <label className="mail-search">
                  <Search size={15} />
                  <input
                    aria-label="Search inbox"
                    placeholder="Search your inbox"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </label>
                <div className="list-tabs">
                  <button
                    className={folder === 'Inbox' ? 'active' : ''}
                    onClick={() => setFolder('Inbox')}
                  >
                    All messages
                  </button>
                  <button
                    className={folder === 'Awaiting approval' ? 'active' : ''}
                    onClick={() => setFolder('Awaiting approval')}
                  >
                    Needs you <b>{awaiting.length}</b>
                  </button>
                </div>
                <div className="mail-rows">
                  {filtered.map((r) => (
                    <button
                      className={`mail-row ${request?.id === r.id ? 'selected' : ''} ${!r.read ? 'unread' : ''}`}
                      key={r.id}
                      onClick={() => {
                        setSelected(r.id);
                        setMobileReader(true);
                        markRead(r.id);
                      }}
                    >
                      <div className="mail-row-top">
                        <TeamAvatar team={r.departmentId} small />
                        <strong>
                          {r.senderName ?? teams[r.departmentId].lead}
                        </strong>
                        <time>{timeText(r.createdAt)}</time>
                      </div>
                      <span className="mail-subject">
                        {conversations[r.eventId].subject}
                      </span>
                      <p>
                        {
                          session.messages
                            .filter((m) => m.requestId === r.id)
                            .at(-1)?.text
                        }
                      </p>
                      <div className="mail-row-bottom">
                        <span className={`mail-tag ${r.status}`}>
                          {r.status === 'pending'
                            ? teamName(r.departmentId)
                            : r.status === 'delegated'
                              ? `With ${teamName(r.delegatedTo!)}`
                              : r.status === 'expired'
                                ? 'Deadline missed'
                                : 'Filed'}
                        </span>
                        {['pending', 'delegated'].includes(r.status) ? (
                          <Deadline request={r} />
                        ) : (
                          <CheckCheck size={14} />
                        )}
                      </div>
                    </button>
                  ))}
                  {!filtered.length && (
                    <div className="empty-inbox">
                      <Inbox size={28} />
                      <h3>Nothing waiting here.</h3>
                      <p>
                        {query
                          ? 'No conversations match your search.'
                          : 'The next request is probably being typed.'}
                      </p>
                    </div>
                  )}
                </div>
                <div className="mail-list-footer">
                  <Activity size={13} />
                  {session.paused
                    ? 'Incoming stream paused'
                    : 'Receiving company messages'}
                </div>
              </section>
              {request ? (
                <RequestThread
                  key={request.id}
                  request={request}
                  chat={false}
                  onBack={() => setMobileReader(false)}
                  onOpenParent={(id) => openRequest(id)}
                />
              ) : (
                <div className="empty-reader">
                  <Mail size={38} />
                  <h2>Your inbox is clear.</h2>
                  <p>Somebody will have an idea shortly.</p>
                </div>
              )}
            </>
          )}
          {view === 'Teams' && (
            <section className="teams-workspace">
              <div className="teams-directory">
                <div className="mail-list-heading">
                  <h2>Company teams</h2>
                  <span>9</span>
                </div>
                {game.departments.map((d) => {
                  const pending = awaiting.filter(
                    (r) => r.departmentId === d.id,
                  ).length;
                  const assigned = delegated.filter(
                    (r) => r.delegatedTo === d.id,
                  ).length;
                  return (
                    <button
                      key={d.id}
                      className={`department-row ${channel === d.id ? 'selected' : ''}`}
                      onClick={() => setChannel(d.id)}
                    >
                      <TeamAvatar team={d.id} />
                      <span>
                        <strong>{d.name}</strong>
                        <small>
                          {pending
                            ? `${pending} awaiting your approval`
                            : assigned
                              ? 'Reviewing delegated decision'
                              : loadRatio(d) > 1.15
                                ? 'Overloaded / escalating'
                                : 'Working independently'}
                        </small>
                      </span>
                      <b>{number(loadRatio(d) * 100)}%</b>
                    </button>
                  );
                })}
              </div>
              <div className="team-channel">
                <header>
                  <TeamAvatar team={channel} />
                  <div>
                    <h1>{teamName(channel)}</h1>
                    <span>
                      {teamLeadName(game, channel)} / {teamPriorities[channel]}
                    </span>
                  </div>
                </header>
                <div className="channel-stats">
                  <span>
                    People{' '}
                    <b>
                      {game.departments.find((d) => d.id === channel)!
                        .officePresence.albion +
                        game.departments.find((d) => d.id === channel)!
                          .officePresence.continental}
                    </b>
                  </span>
                  <span>
                    Workload{' '}
                    <b>
                      {number(
                        loadRatio(
                          game.departments.find((d) => d.id === channel)!,
                        ) * 100,
                      )}
                      %
                    </b>
                  </span>
                  <span>
                    Performance{' '}
                    <b>
                      {number(
                        game.departments.find((d) => d.id === channel)!
                          .performance,
                      )}
                      %
                    </b>
                  </span>
                </div>
                <div className="channel-messages">
                  <TeamMandate
                    id={channel}
                    onOpenEmployee={(id) => {
                      setProfileId(id);
                      setView('People');
                    }}
                  />
                  {session.messages
                    .filter(
                      (m) => m.departmentId === channel || m.author === channel,
                    )
                    .map((m) => (
                      <div key={m.id}>
                        <Message message={m} />
                        {m.requestId && m.kind === 'request' && (
                          <button
                            className="open-approval"
                            onClick={() => openRequest(m.requestId!)}
                          >
                            Open approval thread <ArrowRight size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  {!session.messages.some(
                    (m) => m.departmentId === channel || m.author === channel,
                  ) && (
                    <div className="channel-empty">
                      <CheckCheck size={25} />
                      <h2>The team is working.</h2>
                      <p>No escalations or decisions recorded yet.</p>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}
          {(view === 'People' || view === 'Board' || view === 'Reports') && (
            <CompanyViews
              key={view}
              view={view}
              initialEmployeeId={profileId}
            />
          )}
        </main>
      </div>
      <footer className="status-bar">
        <span>
          <ShieldCheck size={12} />
          {session.paused ? 'Presence: away' : 'Presence: available'}{' '}
          <span className="status-divider">|</span> {game.company.name}
        </span>
        <span>
          Seed {game.seed}
          <span className="status-divider">|</span>Local autosave
        </span>
      </footer>
      <aside
        className="chat-notifications"
        aria-label="Chat notifications"
        aria-live="polite"
      >
        {notifications.map((message) => (
          <div
            className={`chat-toast ${message.kind === 'escalation' ? 'escalated' : ''}`}
            key={message.id}
          >
            <div className="toast-header">
              <MessageSquare size={15} />
              <strong>Omniform Chat</strong>
              <span>
                {message.kind === 'escalation'
                  ? 'Needs attention'
                  : 'New message'}
              </span>
              <button
                className="icon-button"
                aria-label="Dismiss notification"
                onClick={() => setDismissed((ids) => [...ids, message.id])}
              >
                <X size={14} />
              </button>
            </div>
            <button
              className="toast-message"
              onClick={() => {
                if (message.requestId) openRequest(message.requestId);
                else {
                  setChannel(message.departmentId);
                  setView('Chat');
                }
                setDismissed((ids) => [...ids, message.id]);
              }}
            >
              <TeamAvatar
                name={message.authorName}
                team={
                  message.author === 'system' || message.author === 'you'
                    ? message.departmentId
                    : message.author
                }
                small
              />
              <span>
                <strong>
                  {message.author === 'system'
                    ? 'Company secretary'
                    : (message.authorName ??
                      teams[
                        message.author === 'you'
                          ? message.departmentId
                          : message.author
                      ].lead)}
                </strong>
                <p>{message.text}</p>
                <small>
                  Open conversation <ArrowRight size={12} />
                </small>
              </span>
            </button>
          </div>
        ))}
      </aside>
      <dialog ref={shiftDialog} aria-labelledby="shift-length-title">
        <div className="dialog-heading">
          <h2 id="shift-length-title">How long do you have?</h2>
          <button
            className="icon-button"
            aria-label="Cancel start shift"
            onClick={() => shiftDialog.current?.close()}
          >
            <X size={19} />
          </button>
        </div>
        <p>
          Both appointments cover 20 business weeks. Choose a quick shift or the
          standard pace.
        </p>
        <div className="dialog-actions">
          {([10, 20] as const).map((minutes) => (
            <button
              key={minutes}
              className={minutes === 20 ? 'primary' : ''}
              onClick={() => {
                useGameStore.getState().startShift(minutes);
                shiftDialog.current?.close();
              }}
            >
              <Timer size={16} /> {minutes} minutes
            </button>
          ))}
        </div>
      </dialog>
      <dialog ref={dialog}>
        <div className="dialog-heading">
          <h2>New appointment</h2>
          <button
            className="icon-button"
            aria-label="Cancel new appointment"
            onClick={() => dialog.current?.close()}
          >
            <X size={19} />
          </button>
        </div>
        <p>
          This replaces the current live session. Completed scores are retained.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            restart(seed);
            setSelected('request-0');
            setView('Mail');
            setFolder('Inbox');
            setQuery('');
            setDismissed([]);
            setMobileReader(false);
            dialog.current?.close();
          }}
        >
          <label>
            Session seed
            <input
              required
              maxLength={80}
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
            />
          </label>
          <div className="dialog-actions">
            <button
              type="button"
              onClick={() =>
                setSeed(`SLUT-${crypto.randomUUID().slice(0, 8).toUpperCase()}`)
              }
            >
              Random seed
            </button>
            <button className="primary" type="submit">
              Begin appointment
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
