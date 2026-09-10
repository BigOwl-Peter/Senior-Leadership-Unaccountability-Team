# Real-time interaction remake

This supersedes the weekly Close Week interaction, while preserving phase 3 accounting. Phases 4-6 add the [personnel and branching-event systems](phases456.md).

## Clock

One simulation minute resolves one business week. A normal session is 1,200 seconds and twenty automatic resolutions. Requests arrive every 22-29 seeded seconds, with 38-52 second deadlines. They overlap. No new request arrives in the final twenty seconds; outstanding deadlines and delegation times are capped at the session boundary.

The opening Sales contract provides an immediate disagreement with Operations. Later standard scenarios favour the least-seen eligible events across the session, excluding already-open events. Branches are scheduled separately and link back to their originating decision. An opposing team responds four seconds into an open request. At twelve seconds remaining, the requester sends one reminder. The reader toolbar retains the countdown while scrolling.

Pause permits decisions and inspection, intentionally supporting testing and accessibility. Speed changes only the mapping between wall-clock and simulation time. Hidden tabs and page exits pause; saves restore paused. The adapter samples every 250 ms and caps each observed wall-clock gap to one second so stalls cannot silently consume minutes. Fractional seconds are discarded when pausing or changing speed.

## Team agency

All nine departments can request approval. Each has a named lead in the staff roster and an agenda. Threads include proposals, opposition, executive instructions and results. Initial leads are fictional fixtures; the remaining employees are seeded. New messages use the current available lead, while historical messages preserve their author names.

Direct decisions apply their scenario effects once. Missed deadlines use the advertised fallback plus three accountability. Delegation reduces accountability by five and assigns forty work to the receiving department. Twelve seconds later, that team chooses its preferred response. Overloaded teams use the scenario fallback instead. Sales accepts the national contract; Operations negotiates a phased rollout.

An impact assessment extends a deadline fifteen seconds, once per request, at the cost of fifteen work and one approval point. Its chat response reports the team's actual headcount and workload.

Every thirty seconds, offset by fifteen, a seeded department acts independently. Comfortable teams clear eighteen work. Overloaded teams stop non-essential work, pass twelve work to Customer Service and reduce morale by 0.5. These are simulation effects, not decorative messages. Finance reports after each weekly close. Delayed consequences also return as messages.

## Presentation

Mail has folders, a message list and a reading pane. Chat uses threaded messages and contextual commands. Team channels expose capacity and the decision record. New mail, messages and notifications animate; typing only appears before a pending scheduled reply. Reduced-motion preferences disable animations. Popups dismiss or open their thread.

Mobile separates the inbox and reader with a back control. Desktop panes scroll independently. People, Board and Reports remain accessible while the organisation runs.

## Saves and tests

Version-2 saves are isolated from the original key. They contain simulation time, request deadlines and states, delegation owners, messages, company state and scores. No offline catch-up is applied. Invalid state is rejected before rendering.

Tests cover batched versus individual ticks, exact deadlines, idempotent responses, delegation priorities, extensions, autonomous work, full-session completion and save/resume. Browser tests use virtual time for the real clock adapter and capture desktop/tablet/mobile layouts. Original accounting tests remain in place.
