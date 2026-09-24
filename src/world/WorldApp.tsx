import { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  BriefcaseBusiness,
  Building2,
  CircleHelp,
  FileCheck2,
  Laptop,
  MessageSquare,
  Minus,
  Pause,
  Plane,
  Play,
  Plus,
  RotateCcw,
  ShieldCheck,
  Volume2,
  VolumeX,
  Warehouse,
  X,
} from 'lucide-react';
import { useGameStore } from '../stores/gameStore';
import { useGameAudio } from '../hooks/useGameAudio';
import { useLiveClock } from '../hooks/useLiveClock';
import { Workspace } from '../app/App';
import { realSeconds } from '../game/sessionTiming';
import { teamName, timeText } from '../game/live';
import { departmentDefinitions } from '../data/departments';
import type { DepartmentId } from '../models/game';
import { money } from '../utils/format';
import {
  characters,
  chatter,
  mdMood,
  mdName,
  offices,
  scriptFor,
  type Avatar,
  type WorldChoice,
} from './model';
import { worldChoiceEffects } from './engine';
import { OfficeScene, type Target } from './OfficeScene';
import { spriteCanvas, radishCanvas } from './art';
import { meetingRounds, ceoOrders, type PoliticalMove } from './politics';
import './world.css';

function Portrait({
  avatar,
  boss = false,
  radish = false,
}: {
  avatar: Avatar;
  boss?: boolean;
  radish?: boolean;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = canvas.current?.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, 32, 48);
      ctx.drawImage(
        radish
          ? radishCanvas()
          : spriteCanvas(
              boss
                ? { skin: '#d9a381', coat: '#493f59', hair: '#ddd7c3' }
                : characters.find((c) => c.id === avatar)!,
              0,
              boss,
            ),
        0,
        0,
      );
    }
  }, [avatar, boss, radish]);
  return (
    <canvas
      ref={canvas}
      width={32}
      height={48}
      className="world-portrait"
      role="img"
      aria-label={
        radish
          ? 'Radish / CEO Team'
          : boss
            ? mdName
            : characters.find((c) => c.id === avatar)!.name
      }
    />
  );
}
function OfficeCanvas({
  blocked,
  onInteract,
  onNear,
  sceneRef,
  direction,
}: {
  blocked: boolean;
  onInteract: (t: Target) => void;
  onNear: (t: Target | null) => void;
  sceneRef: React.RefObject<OfficeScene | null>;
  direction: React.RefObject<{ x: number; y: number }>;
}) {
  const host = useRef<HTMLDivElement>(null);
  const flags = useRef({ blocked, onInteract, onNear });
  useEffect(() => {
    flags.current = { blocked, onInteract, onNear };
  }, [blocked, onInteract, onNear]);
  useEffect(() => {
    if (!host.current) return;
    const scene = new OfficeScene({
      getSession: () => useGameStore.getState().session,
      blocked: () => flags.current.blocked,
      direction: () => direction.current,
      near: (t) => flags.current.onNear(t),
      interact: (t) => flags.current.onInteract(t),
      position: (x, y) => useGameStore.getState().movePlayer(x, y),
    });
    sceneRef.current = scene;
    const game = new Phaser.Game({
      type: Phaser.CANVAS,
      parent: host.current,
      backgroundColor: '#708875',
      pixelArt: true,
      roundPixels: true,
      scale: {
        mode: Phaser.Scale.RESIZE,
        width: host.current.clientWidth,
        height: host.current.clientHeight,
      },
      physics: { default: 'arcade', arcade: { debug: false } },
      scene: [scene],
      audio: { noAudio: true },
      input: { keyboard: true },
      render: { antialias: false },
    });
    return () => {
      sceneRef.current = null;
      game.destroy(true);
    };
  }, [sceneRef, direction]);
  return (
    <div
      className="world-canvas"
      ref={host}
      role="application"
      aria-label="Walkable office floor"
      tabIndex={0}
    />
  );
}
function Modal({
  title,
  close,
  children,
  className = '',
}: {
  title: string;
  close: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className={`world-dialog ${className}`}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
    >
      <header>
        <h2>{title}</h2>
        <button onClick={close} aria-label={`Close ${title}`} title="Close">
          <X size={20} />
        </button>
      </header>
      {children}
    </dialog>
  );
}
export default function WorldApp() {
  const { session, notice, setPaused, beginWorld, worldDecision, fly } =
    useGameStore();
  const w = session.world;
  const politics = w?.politics,
    meeting = politics?.meeting,
    ceoOrder = politics?.order;
  const politicalRound = meeting
    ? meetingRounds[(meeting.theme + meeting.round) % meetingRounds.length]
    : null;
  const { muted, toggleMusic, audioError } = useGameAudio();
  useLiveClock(!!w);
  const [avatar, setAvatar] = useState<Avatar>('operator'),
    [team, setTeam] = useState<DepartmentId>('operations'),
    [name, setName] = useState('Zanele Dube');
  const [laptop, setLaptop] = useState(false),
    [help, setHelp] = useState(false),
    [target, setTarget] = useState<Target | null>(null),
    [near, setNear] = useState<Target | null>(null),
    [caseId, setCaseId] = useState<string | null>(null),
    [travel, setTravel] = useState(false),
    [restart, setRestart] = useState(false),
    [summary, setSummary] = useState(false);
  const scene = useRef<OfficeScene | null>(null),
    direction = useRef({ x: 0, y: 0 });
  const priorPause = useRef(true);
  const suspended = help || restart;
  const blocked =
    !w ||
    laptop ||
    suspended ||
    !!target ||
    !!caseId ||
    travel ||
    !!w?.flight ||
    summary;
  const openHelp = () => {
    priorPause.current = session.paused;
    setPaused(true);
    setHelp(true);
  };
  const closeHelp = () => {
    setHelp(false);
    setPaused(priorPause.current);
  };
  const interact = (t: Target) => {
    if (t.kind === 'travel') setTravel(true);
    else if (t.kind === 'laptop') setLaptop(true);
    else {
      setTarget(t);
      setCaseId(
        w?.cases.find((c) => c.employeeId === t.id && !c.choice)?.id ?? null,
      );
    }
  };
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input,select,textarea,dialog'))
        return;
      if (e.code === 'KeyL' && w && !suspended) {
        e.preventDefault();
        setLaptop((v) => !v);
      }
      if (
        e.code === 'Space' &&
        w &&
        !laptop &&
        !target &&
        !caseId &&
        !travel &&
        !suspended
      ) {
        e.preventDefault();
        setPaused(!useGameStore.getState().session.paused);
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [w, laptop, target, caseId, travel, suspended, setPaused]);
  useEffect(() => {
    if (session.game.status === 'finished' && w) setSummary(true);
  }, [session.game.status, w]);
  const activeCase = w?.cases.find((c) => c.id === caseId);
  const pending = w?.cases.filter((c) => !c.choice) ?? [];
  const md = pending.find((c) => c.kind === 'md');
  const person = session.game.employees.find((e) => e.id === target?.id);
  const unread = session.requests.filter((r) => !r.read).length;
  const musicButton = (
    <button
      title={muted ? 'Unmute music' : 'Mute music'}
      aria-label={muted ? 'Unmute music' : 'Mute music'}
      onClick={toggleMusic}
    >
      {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
    </button>
  );
  const closeConversation = () => {
    setTarget(null);
    setCaseId(null);
  };
  const start = () => {
    beginWorld(avatar, team, name, 20);
    setNear(null);
  };
  const reset = () => {
    useGameStore.getState().restart(session.game.seed);
    setRestart(false);
    setSummary(false);
    setLaptop(false);
    setTarget(null);
    setCaseId(null);
    setNear(null);
  };
  return (
    <main className="corporate-world">
      <header className="world-topbar">
        <div className="world-brand">
          <img
            src={`${import.meta.env.BASE_URL}media/SLUT Logo.png`}
            alt="S.L.U.T."
          />
          <span>
            S.L.U.T.<small>FIELD OPERATIONS</small>
          </span>
        </div>
        <div className="world-identity">
          {w ? (
            <>
              <b>{w.name}</b>
              <span>Head of {teamName(w.team)}</span>
            </>
          ) : (
            <>
              <b>Senior Leadership Unaccountability Team</b>
              <span>
                Your presence is required. Your responsibility is negotiable.
              </span>
            </>
          )}
        </div>
        <div className="world-top-actions">
          {musicButton}
          <button
            aria-label="How to play"
            title="How to play"
            onClick={openHelp}
          >
            <CircleHelp size={19} />
          </button>
          {w && (
            <button
              aria-label="Restart career"
              title="Restart career"
              onClick={() => {
                priorPause.current = session.paused;
                setPaused(true);
                setRestart(true);
              }}
            >
              <RotateCcw size={18} />
            </button>
          )}
        </div>
      </header>
      {w && (
        <section className="world-commandbar" aria-label="Career status">
          <div className="world-personal">
            <ShieldCheck size={20} />
            <span>
              YOUR ACCOUNTABILITY
              <strong>
                {Math.round(session.game.metrics.accountability)}
                <small>/100</small>
              </strong>
            </span>
            <em>Target: zero</em>
            <small className="politics-bonus">
              Meetings +{session.game.meetingBonus ?? 0} pts
            </small>
          </div>
          {(['albion', 'continental'] as const).map((id) => (
            <div
              key={id}
              className={`world-office-stat ${w.office === id ? 'current' : ''}`}
            >
              <Building2 size={18} />
              <span>
                <b>
                  {offices[id].short} / {offices[id].name}
                </b>
                <small>Corruption {Math.round(w.corruption[id])}%</small>
                <meter
                  min={0}
                  max={100}
                  low={40}
                  high={70}
                  optimum={0}
                  value={w.corruption[id]}
                  aria-label={`${offices[id].name} corruption`}
                />
              </span>
            </div>
          ))}
          <div className="world-time">
            <b>Week {session.game.turn}</b>
            <small>ONGOING CAREER</small>
            <small title="Annualised company turnover">
              {money(session.game.metrics.turnover)} turnover
            </small>
            <button
              onClick={() => setPaused(!session.paused)}
              disabled={session.game.status === 'finished'}
              aria-label={session.paused ? 'Resume career' : 'Pause career'}
              title={session.paused ? 'Resume' : 'Pause'}
            >
              {session.paused ? <Play size={18} /> : <Pause size={18} />}
            </button>
          </div>
        </section>
      )}
      <div className="world-stage">
        <OfficeCanvas
          key={w ? `${session.game.seed}-${w.office}` : 'preview'}
          blocked={blocked}
          onInteract={interact}
          onNear={setNear}
          sceneRef={scene}
          direction={direction}
        />
        {!w && (
          <div className="world-setup-scrim">
            <section className="world-setup" aria-label="Create your executive">
              <div className="world-setup-heading">
                <span>OMNIFORM GROUP / NEW APPOINTMENT</span>
                <h1>Welcome to the top.</h1>
                <p>
                  Two offices. One unpredictable MD. Absolutely none of this
                  should be your fault.
                </p>
              </div>
              <div className="world-character-grid">
                {characters.map((c) => (
                  <button
                    key={c.id}
                    className={avatar === c.id ? 'chosen' : ''}
                    aria-pressed={avatar === c.id}
                    onClick={() => {
                      setAvatar(c.id);
                      setName(c.name);
                    }}
                  >
                    <Portrait avatar={c.id} />
                    <strong>{c.name}</strong>
                    <span>{c.title}</span>
                    <small>{c.perk}</small>
                  </button>
                ))}
              </div>
              <div className="world-setup-fields">
                <label>
                  Your name
                  <input
                    maxLength={40}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
                <label>
                  Your leadership team
                  <select
                    value={team}
                    onChange={(e) => setTeam(e.target.value as DepartmentId)}
                  >
                    {departmentDefinitions.map((d) => (
                      <option key={d.id} value={d.id}>
                        Head of {d.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <footer>
                <span>
                  <Building2 size={16} /> First posting: London, UK
                </span>
                <button className="world-primary" onClick={start}>
                  <BriefcaseBusiness size={18} /> Accept appointment
                </button>
              </footer>
            </section>
          </div>
        )}
        {w && (
          <>
            <div className="world-location">
              <span className="world-live-dot" />
              <b>{offices[w.office].name}</b>
              <span>{offices[w.office].country}</span>
              <small>
                {
                  session.game.employees.filter(
                    (e) =>
                      e.officeId === w.office &&
                      ['active', 'notice', 'absent'].includes(e.status),
                  ).length
                }{' '}
                staff on site
              </small>
            </div>
            <aside
              className={`world-md ${md ? 'calling' : ''}`}
              aria-label="Managing director"
            >
              <Portrait avatar="auditor" boss />
              <div>
                <span>THE MANAGING DIRECTOR</span>
                <b>{mdName}</b>
                <small>
                  {mdMood(session.elapsed)} / favour {Math.round(w.mdFavor)}%
                </small>
                {md ? (
                  <button
                    onClick={() => {
                      setCaseId(md.id);
                      setTarget(null);
                    }}
                  >
                    Answer directive{' '}
                    <span>
                      {timeText(realSeconds(session, md.due - session.elapsed))}
                    </span>
                  </button>
                ) : (
                  <p>"I want outcomes. Specifically, someone else's."</p>
                )}
              </div>
            </aside>
            <aside className="world-matters" aria-label="Office matters">
              <h2>
                <MessageSquare size={15} /> On the floor{' '}
                <span>{pending.filter((c) => c.kind === 'local').length}</span>
              </h2>
              {meeting && ['invited', 'playing'].includes(meeting.status) && (
                <button
                  onClick={() =>
                    scene.current?.find(
                      meeting.office === w.office ? 'meeting' : 'travel',
                    )
                  }
                >
                  <b>S.L.U.T. meeting / +25 attendance</b>
                  <small>
                    {offices[meeting.office].name} / in person{' '}
                    <span>
                      {session.elapsed < meeting.starts
                        ? `Starts ${timeText(realSeconds(session, meeting.starts - session.elapsed))}`
                        : `Ends ${timeText(realSeconds(session, meeting.ends - session.elapsed))}`}
                    </span>
                  </small>
                </button>
              )}
              {ceoOrder && !ceoOrder.resolved && (
                <button
                  onClick={() =>
                    scene.current?.find(
                      ceoOrder.office === w.office ? 'ceo' : 'travel',
                    )
                  }
                >
                  <b>URGENT / Radish, CEO Team</b>
                  <small>
                    {offices[ceoOrder.office].name} / in person{' '}
                    <span>
                      {timeText(
                        realSeconds(session, ceoOrder.due - session.elapsed),
                      )}
                    </span>
                  </small>
                </button>
              )}
              {pending
                .filter((c) => c.kind === 'local')
                .slice(0, 3)
                .map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      if (c.office === w.office) {
                        scene.current?.find(c.employeeId);
                      } else scene.current?.find('travel');
                    }}
                  >
                    <b>{scriptFor(c)[0]}</b>
                    <small>
                      {offices[c.office].short} / {teamName(c.departmentId)}{' '}
                      <span>
                        {timeText(
                          realSeconds(session, c.due - session.elapsed),
                        )}
                      </span>
                    </small>
                  </button>
                ))}
              {!pending.some((c) => c.kind === 'local') && (
                <p>No floor escalations. Suspiciously quiet.</p>
              )}
            </aside>
            <div className="world-tools">
              <button
                aria-label="Zoom in"
                title="Zoom in"
                onClick={() => scene.current?.zoom(0.15)}
              >
                <Plus size={18} />
              </button>
              <button
                aria-label="Zoom out"
                title="Zoom out"
                onClick={() => scene.current?.zoom(-0.15)}
              >
                <Minus size={18} />
              </button>
              <button
                aria-label="Find stock room"
                title="Walk to stock and dispatch"
                onClick={() => scene.current?.find('stock')}
              >
                <Warehouse size={18} />
              </button>
              <button
                aria-label="Find meeting room"
                title="Walk to meeting room"
                onClick={() => scene.current?.find('meeting')}
              >
                <BriefcaseBusiness size={18} />
              </button>
              <button
                aria-label="Find CEO team"
                title="Walk to CEO-team visiting suite"
                onClick={() => scene.current?.find('ceo')}
              >
                <ShieldCheck size={18} />
              </button>
              <button
                aria-label="Find travel desk"
                title="Walk to travel desk"
                onClick={() => scene.current?.find('travel')}
              >
                <Plane size={18} />
              </button>
            </div>
            {session.paused && !blocked && (
              <div className="world-paused">
                <Pause size={18} /> Career paused{' '}
                <button onClick={() => setPaused(false)}>Resume</button>
              </div>
            )}
            <div className="world-bottom">
              <div className="world-latest">
                <FileCheck2 size={17} />
                <span>{w.log.at(-1)?.text}</span>
              </div>
              <div className="world-bottom-actions">
                {near && (
                  <button
                    className="world-interact"
                    onClick={() => interact(near)}
                  >
                    <MessageSquare size={17} />
                    {near.kind === 'person'
                      ? `Talk to ${near.name}`
                      : near.name}
                  </button>
                )}
                <button
                  className="world-laptop-button"
                  onClick={() => setLaptop(true)}
                >
                  <Laptop size={21} />
                  <span>Open laptop</span>
                  {unread > 0 && <b>{unread}</b>}
                </button>
              </div>
            </div>
            <div className="world-touch" aria-label="Movement controls">
              {[
                { label: 'Move up', x: 0, y: -1, icon: ArrowUp },
                { label: 'Move left', x: -1, y: 0, icon: ArrowLeft },
                { label: 'Move down', x: 0, y: 1, icon: ArrowDown },
                { label: 'Move right', x: 1, y: 0, icon: ArrowRight },
              ].map((d) => (
                <button
                  key={d.label}
                  aria-label={d.label}
                  onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture(e.pointerId);
                    direction.current = { x: d.x, y: d.y };
                  }}
                  onPointerUp={() => {
                    direction.current = { x: 0, y: 0 };
                  }}
                  onPointerCancel={() => {
                    direction.current = { x: 0, y: 0 };
                  }}
                >
                  <d.icon size={20} />
                </button>
              ))}
            </div>
            {w.flight && (
              <div className="world-flight">
                <Plane size={48} />
                <span>EXECUTIVE MOBILITY / IN TRANSIT</span>
                <h2>
                  {offices[w.office].code} <ArrowRight />{' '}
                  {offices[w.flight.to].code}
                </h2>
                <p>
                  Arriving in{' '}
                  {timeText(
                    realSeconds(session, w.flight.arrives - session.elapsed),
                  )}
                </p>
                <p>
                  Both offices are still operating. Your accountability is not
                  on holiday.
                </p>
                <button onClick={() => setLaptop(true)}>
                  <Laptop size={18} /> Open cabin laptop
                </button>
                {session.paused && (
                  <button onClick={() => setPaused(false)}>
                    Resume flight
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
      {(notice || audioError) && (
        <div className="world-notice" role="status">
          {notice || audioError}
        </div>
      )}
      {laptop && w && (
        <Modal
          title="Executive laptop"
          close={() => setLaptop(false)}
          className="world-laptop"
        >
          <Workspace
            musicButton={musicButton}
            runClock={false}
            onHome={() => setLaptop(false)}
          />
        </Modal>
      )}
      {target?.kind === 'stock' && w && (
        <Modal
          title={`${offices[w.office].name} stock and dispatch`}
          close={closeConversation}
        >
          <p>
            {w.logistics?.[w.office].activity ?? 'Preparing the stock count'}
          </p>
          <dl>
            <dt>Stock on hand</dt>
            <dd>{w.logistics?.[w.office].units ?? 0} units</dd>
            <dt>Verified for dispatch</dt>
            <dd>{w.logistics?.[w.office].counted ?? 0} units</dd>
            <dt>Dispatched</dt>
            <dd>{w.logistics?.[w.office].shipped ?? 0} units</dd>
            <dt>Lost consignments</dt>
            <dd>{w.logistics?.[w.office].lost ?? 0} units</dd>
          </dl>
          <button
            onClick={() => {
              closeConversation();
              setLaptop(true);
            }}
          >
            Open logistics correspondence
          </button>
        </Modal>
      )}
      {target?.kind === 'meeting' && w && (
        <Modal title="S.L.U.T. leadership meeting" close={closeConversation}>
          {!meeting || meeting.office !== w.office ? (
            <p>
              No meeting is booked in this office.{' '}
              {meeting &&
                `The next session is in ${offices[meeting.office].name}.`}
            </p>
          ) : (
            <>
              <p>
                {offices[meeting.office].name} / Attendance +25 points / Three
                political rounds
              </p>
              <p role="status">{meeting.feedback}</p>
              {meeting.status === 'invited' && (
                <button
                  className="world-primary"
                  disabled={session.elapsed < meeting.starts}
                  onClick={() => useGameStore.getState().attendMeeting()}
                >
                  {session.elapsed < meeting.starts
                    ? `Starts in ${timeText(realSeconds(session, meeting.starts - session.elapsed))}`
                    : 'Take your seat (+25 points)'}
                </button>
              )}
              {meeting.status === 'playing' && politicalRound && (
                <>
                  <h3>
                    Round {meeting.round + 1}: {politicalRound.title}
                  </h3>
                  <p>{politicalRound.cue}</p>
                  <div className="politics-choices">
                    {(['md', 'ceo', 'record'] as PoliticalMove[]).map(
                      (move, i) => (
                        <button
                          key={move}
                          onClick={() =>
                            useGameStore.getState().playPolitics(move)
                          }
                        >
                          {politicalRound.responses[i]}
                        </button>
                      ),
                    )}
                  </div>
                </>
              )}
              {meeting.status === 'complete' && (
                <p>
                  Meeting complete. Your bonuses are included in the leadership
                  score.
                </p>
              )}
            </>
          )}
          {notice && <p role="alert">{notice}</p>}
        </Modal>
      )}
      {target?.kind === 'ceo' && w && (
        <Modal title="Parent company / CEO Team" close={closeConversation}>
          <div className="world-speaker">
            <Portrait avatar="auditor" radish />
            <div>
              <b>Radish</b>
              <span>CEO Team / Executive urgency</span>
            </div>
          </div>
          <p>
            Ledger: Group Assurance. Velvet: Strategic Alignment. External
            reporting line: parent-company CEO.
          </p>
          <p>
            CEO-team favour {politics?.ceoFavor ?? 45}% / MD favour{' '}
            {Math.round(w.mdFavor)}%
          </p>
          {politics?.ceoOffice !== w.office ? (
            <p>
              The CEO team is visiting{' '}
              {offices[politics?.ceoOffice ?? 'continental'].name}.
            </p>
          ) : ceoOrder && !ceoOrder.resolved ? (
            <>
              <h3>{ceoOrders[ceoOrder.topic][0]}</h3>
              <p>{ceoOrders[ceoOrder.topic][1]}</p>
              <div className="politics-choices">
                <button
                  onClick={() => useGameStore.getState().answerCEO('ceo')}
                >
                  Prioritise Radish / CEO favour +12, MD favour -8
                </button>
                <button onClick={() => useGameStore.getState().answerCEO('md')}>
                  Back the MD / MD favour +8, accountability +3
                </button>
                <button
                  onClick={() => useGameStore.getState().answerCEO('record')}
                >
                  Get Radish to sign the scope / accountability -4
                </button>
              </div>
            </>
          ) : (
            <p>
              {ceoOrder?.outcome ||
                '"I am part of the CEO team. Please remain urgently available."'}
            </p>
          )}
          {notice && <p role="alert">{notice}</p>}
        </Modal>
      )}
      {((target && !['stock', 'meeting', 'ceo'].includes(target.kind)) ||
        activeCase) &&
        w && (
          <Modal
            title={
              activeCase
                ? scriptFor(activeCase)[0]
                : (target?.name ?? 'Conversation')
            }
            close={closeConversation}
            className="world-conversation"
          >
            <div className="world-speaker">
              <Portrait
                avatar={activeCase?.kind === 'md' ? 'auditor' : avatar}
                boss={activeCase?.kind === 'md' || target?.id === 'md'}
              />
              <div>
                <b>
                  {activeCase?.kind === 'md'
                    ? mdName
                    : person
                      ? `${person.firstName} ${person.surname}`
                      : target?.name}
                </b>
                <span>
                  {activeCase
                    ? `${offices[activeCase.office].name} / ${teamName(activeCase.departmentId)}`
                    : person
                      ? person.jobTitle
                      : 'Managing director'}
                </span>
              </div>
            </div>
            <blockquote>
              {activeCase
                ? scriptFor(activeCase)[1]
                : target?.id === 'md'
                  ? 'The stimulant-fuelled vision is simple: more growth, less sleep, and your signature on the consequences.'
                  : chatter[(person?.firstName.length ?? 0) % chatter.length]}
            </blockquote>
            {activeCase && !activeCase.choice ? (
              <>
                <p className="world-decision-deadline">
                  Decision due in{' '}
                  {timeText(
                    realSeconds(session, activeCase.due - session.elapsed),
                  )}
                  . The clock is still running.
                </p>
                <div className="world-choices">
                  {(['comply', 'document', 'refuse'] as WorldChoice[]).map(
                    (choice, index) => {
                      const effects = worldChoiceEffects(
                        session,
                        activeCase,
                        choice,
                      );
                      return (
                        <button
                          key={choice}
                          disabled={
                            effects.cost > 0 &&
                            session.game.company.cash -
                              session.game.company.pendingCosts <
                              effects.cost
                          }
                          onClick={() => worldDecision(activeCase.id, choice)}
                        >
                          <strong>{scriptFor(activeCase)[index + 2]}</strong>
                          <span>
                            Accountability{' '}
                            {effects.accountability > 0 ? '+' : ''}
                            {effects.accountability} / corruption{' '}
                            {effects.corruption > 0 ? '+' : ''}
                            {effects.corruption} / MD favour{' '}
                            {effects.favor > 0 ? '+' : ''}
                            {effects.favor}
                          </span>
                          <small>
                            {money(effects.cost)} / team morale{' '}
                            {effects.morale > 0 ? '+' : ''}
                            {effects.morale}
                          </small>
                        </button>
                      );
                    },
                  )}
                </div>
              </>
            ) : (
              <>
                <p>
                  {activeCase?.outcome ??
                    (person
                      ? `Morale ${Math.round(person.morale)} / stress ${Math.round(person.stress)}. The laptop holds their full record.`
                      : 'He would like a different answer to the same question.')}
                </p>
                <button className="world-primary" onClick={closeConversation}>
                  Back to the office
                </button>
              </>
            )}
          </Modal>
        )}
      {travel && w && !w.flight && (
        <Modal title="Executive travel desk" close={() => setTravel(false)}>
          <Plane size={36} />
          <h3>
            {offices[w.office].name} to{' '}
            {offices[w.office === 'albion' ? 'continental' : 'albion'].name}
          </h3>
          <p>
            Return service / executive fare: £2,500 per leg. Transit takes{' '}
            {realSeconds(session, 30)} seconds at the current pace. Both offices
            and their deadlines continue.
          </p>
          {meeting &&
            meeting.office !== w.office &&
            ['invited', 'playing'].includes(meeting.status) && (
              <p>
                <b>Reason to travel:</b> S.L.U.T. meeting in{' '}
                {offices[meeting.office].name}. In-person attendance earns 25
                points; political rounds can earn another 45.{' '}
                {session.elapsed < meeting.starts
                  ? `Starts in ${timeText(realSeconds(session, meeting.starts - session.elapsed))}.`
                  : `Ends in ${timeText(realSeconds(session, meeting.ends - session.elapsed))}.`}
              </p>
            )}
          {ceoOrder && !ceoOrder.resolved && ceoOrder.office !== w.office && (
            <p>
              <b>CEO-team summons:</b> Radish requires you in{' '}
              {offices[ceoOrder.office].name} within{' '}
              {timeText(realSeconds(session, ceoOrder.due - session.elapsed))}.
              He has mentioned his reporting line again.
            </p>
          )}
          <button
            className="world-primary"
            onClick={() => {
              fly();
              if (useGameStore.getState().session.world?.flight)
                setTravel(false);
            }}
          >
            Board flight <ArrowRight size={18} />
          </button>
          {notice && <p role="status">{notice}</p>}
        </Modal>
      )}
      {help && (
        <Modal title="How to play" close={closeHelp}>
          <h3>Two offices. Zero accountability.</h3>
          <p>
            Walk with WASD or arrow keys, or click a destination. Click a staff
            sprite to approach and talk. E interacts with the nearest person or
            desk. Touch controls are available on small screens.
          </p>
          <p>
            Run the UK and South African offices without letting either
            corruption meter reach 70. High corruption triggers audits. Losing
            the MD's favour also makes you a convenient scapegoat.
          </p>
          <p>
            Comply for immediate favour, demand signed ownership to protect
            yourself, or spend money to clean up the office. Your character and
            chosen leadership team change the trade-offs.
          </p>
          <p>
            L opens your laptop: the original Mail, Chat, Teams, People and
            Staff Survey systems all remain active. Walk to the travel desk to
            fly between offices. Space pauses. Keep accountability low and both
            offices trading. There is no time limit: 100% accountability or zero
            annualised turnover ends your career. Stock teams count and dispatch
            goods; unresolved logistics requests hold shipments and missed
            deadlines lose stock and customers. Leadership meetings rotate
            between offices: attend in person for 25 bonus points, then read the
            evidence in three political rounds for up to 45 more. Radish's
            CEO-team requests require a visit to his current office. The agenda
            shows where to travel and how long you have.
          </p>
          <p>
            The MD is a fictional executive whose stimulant abuse, sleepless
            grandiosity and reversals drive irrational orders. This is satire,
            not a model of real drug use.
          </p>
          <button className="world-primary" onClick={closeHelp}>
            Return to work
          </button>
        </Modal>
      )}
      {restart && (
        <Modal
          title="Restart career?"
          close={() => {
            setRestart(false);
            setPaused(priorPause.current);
          }}
        >
          <p>
            Your current appointment will be replaced. The original laptop-only
            game and its saves are separate.
          </p>
          <button className="world-primary" onClick={reset}>
            Choose a new executive
          </button>
        </Modal>
      )}
      {summary && w && (
        <Modal title="Appointment review" close={() => setSummary(false)}>
          <ShieldCheck size={38} />
          <h3>
            {session.game.metrics.turnover <= 0
              ? 'Nothing left to sell.'
              : 'The paper trail found you.'}
          </h3>
          <p>
            Personal accountability:{' '}
            {Math.round(session.game.metrics.accountability)}/100. Target: zero.
          </p>
          <p>
            UK corruption: {Math.round(w.corruption.albion)}%. South Africa:{' '}
            {Math.round(w.corruption.continental)}%. Target: both below 70%.
          </p>
          <p>
            {w.cases.filter((c) => c.choice && c.choice !== 'expired').length}{' '}
            floor decisions on record. {w.visits.continental} visits to South
            Africa. The board thanks whoever is available.
          </p>
          <button className="world-primary" onClick={reset}>
            New appointment
          </button>
          <button
            onClick={() => {
              setSummary(false);
              setLaptop(true);
            }}
          >
            Inspect the laptop record
          </button>
        </Modal>
      )}
      <span className="world-build">2D FORK / PLAYABLE PROTOTYPE</span>
    </main>
  );
}
