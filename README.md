# S.L.U.T. - Senior Leadership Unaccountability Team

A real-time corporate decision game with phases 1-6 and the adapted phase 7-9 team-led expansion implemented for playable testing. Browser gameplay, with no backend or runtime AI.

## Play

Requires Node.js 22.12+ (tested on Node 24).

```sh
npm ci
npm run dev
```

Open the address printed by Vite, click the wallpaper to enter the workspace, then press **Start shift**. A normal session lasts 20 minutes. Business weeks now resolve automatically every 60 simulation seconds; there is no Close Week button.

The supplied wallpaper and logo appear on the splash screen and game header. Clicking the header logo pauses and returns home without resetting progress. Entry uses a short zoom/fade, skipped for reduced-motion preferences. Background music loops on both screens; the music button beside pause remembers its setting. Browsers may require the first click before permitting music. Music mute does not silence the separate email and incoming-chat notification effects. Old messages are not replayed on restore. Media is bundled locally in `public/media/`.

- Requests arrive every 22-29 seconds with overlapping 38-52 second approval deadlines. Choose a response in the thread, with effects shown under each option.
- Ignore a request and the team executes its stated fallback. A missed sign-off adds 3 accountability on top of that response's effects.
- Delegate to another department: accountability -5, receiving team work +40. The team decides after 12 seconds, using its priorities and capacity.
- Request one impact assessment per request: 15 more seconds, 15 extra work and 1 less board approval.
- Teams shows department workload, priorities, independent actions and approval conversations. Chat popups open their associated thread.
- Teams now also has a group mandate (balanced, growth, quality or people), trust and expandable membership. Policies change weekly behaviour and delegated choices. One policy change per team per week adds coordination work. Healthy teams take ownership of routine employee matters themselves.
- Chat contains 12 employee-matter types and named leadership messages. Fund action, entrust the team and HR, or decline; outcomes return later. Trust, capacity, morale, stress and grievances carry forward. Unresolved matters escalate; departures do not erase complaints.
- Mail retains an Outlook-style folder/inbox/reading-pane layout. Chat is a separate Teams-inspired messenger with searchable conversations, employee avatars, unread indicators, a leadership group and contextual replies. Mobile uses a conversation list and back navigation. Popup overlays are suppressed while Chat is open so they cannot cover replies; notification sounds remain active. Replies are authored game actions, not free-text AI chat.
- Reports tracks delivery backlog, product defects, regulatory exposure and lost accounts. Growth promises and overloaded teams feed downstream pressure, rework, fines and lost revenue. Pressure increases after six and twelve simulation minutes, with tighter request deadlines and more frequent late-game arrivals.
- Restart Career is available from the game header and splash, with confirmation. It restarts the current seed and retains completed scores; the in-game dialog also allows a different seed.
- People has employee profiles, promotions, redundancy, retention offers, department/office transfers and recruitment. Three management actions refresh each business week.
- Candidates have uncertain interview estimates and join after 1-3 weeks. Stress can cause absence or notice; payroll and capacity reflect actual employment.
- Offices compares headcount and payroll against four possible board mandates. Board and Reports retain financials and the final assessment. Profit has zero direct score weighting.
- There are 27 standard scenarios and 15 follow-ups, including supplier disputes, phishing, grievances, ERP changes, audits and expenses. Eligible unseen scenarios take priority over repeats; choices can lead to linked follow-up threads.
- Pause at any time or use 1x, 2x and 4x speed. Background tabs auto-pause. Reload restores paused without charging offline time.
- Decision speed adjusts leadership score by up to +/-600 points, averaged across assessed requests. An immediate response earns full credit, halfway through the original deadline is neutral, and expiry earns the full penalty. Delegation is assessed at handoff, once; assessments do not reset the timing window. Pauses freeze simulation time. Board shows the live score and speed contribution; the total stays within 0-6,000. Previous saves start timing assessment from their next decision, and historic scores remain unchanged.

## Verify

```sh
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:e2e
npm run format:check
```

The unit suite covers the underlying simulation and deterministic scheduling. Browser tests use a virtual clock for deadlines, pause, speed, delegation, reload, offline play, completion and responsive screenshots. Screenshots are in `test-results/`.

## Architecture

- `src/game/live.ts`: deterministic integer-second scheduler and request commands, without React, browser timers, storage or wall-clock time.
- `src/game/engine.ts`: existing pure company simulation, reused for real-time decisions and automatic weekly accounting.
- `src/data/teams.ts`: fictional department leads, agendas, preferred responses, proposals, objections and reminders. Leads also appear in the employee roster.
- `src/data/events.ts`, `teamEvents.ts` and `expandedEvents.ts`: 42 authored scenarios covering all nine departments, with conditional eligibility and branching outcomes.
- `src/game/employees.ts`, `personnel.ts` and `src/data/people.ts`: seeded staff, mechanical traits, employment lifecycle, recruitment and office mandates.
- `src/hooks/useLiveClock.ts`: browser clock adapter and visibility pausing; bounded catch-up for browser stalls.
- `src/stores/gameStore.ts`: application commands, local save/resume and high scores.
- `src/game/liveSave.ts`: version-2 save validation, including deadlines, request identity and ownership.

Batched clock steps produce the same result as individual seconds. The session ends at 1,200 seconds after settling remaining requests. High scores are recorded once.

Live saves use `slut-live-save-v2`. Previous live saves receive additive defaults; their first candidate shortlist arrives at the next business week. Start a new appointment for the full generated workforce and varied mandate. Earlier saves under `slut-save-v1` remain untouched and are not loaded into the new timing model. Chat history, pending ownership, recruitment and scheduled branches survive reload. Invalid saves show a recovery notice; unavailable storage does not block gameplay.

## Scope

Phases 4-6 extend the real-time prototype with employee simulation, branching events and office management. The adapted phase 7-9 build adds connected aggregate business systems, group mandates and consequential employee chat. Products and legislation are represented by aggregate defects and regulatory exposure, not SKU-level production or jurisdiction-specific rules. Final balancing remains later work. The expanded deck can repeat after eligible unseen events are exhausted. Chat uses authored, state-driven conversations and contextual commands, not free-text AI chat. Team trust persists within a career, not across restarts; this is not yet a full relationship or faction simulation.

See [real-time design notes](docs/realtime.md), [personnel and event notes](docs/phases456.md) and [underlying simulation notes](docs/simulation.md).

## Build

`npm run build` produces `dist/` for static hosting, with relative asset paths and locally bundled fonts. Gameplay continues without network after loading. Cold offline navigation has no service worker. Development commands do not deploy the site.
