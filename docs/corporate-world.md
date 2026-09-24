# Corporate World Fork

Isolated 2D office-satire branch: `codex/corporate-world`.
The original management prototype remains on `master`. The public GitHub Pages site deploys this fork only when it is explicitly pushed; local edits do not change the public test game.

This fork reuses the existing company simulation and laptop interface, including the Staff Survey. The new floor-level career adds two walkable offices, player identity, local corruption, MD orders, conversations and travel.

## Playable Slice

- Choose one of four executives, a name and a team for an ongoing career.
- Eleven playable departments include BDMs (Business Development Managers) and Specialists, with their own leaders, staff, recruitment and decisions. Old nine-department saves gain both teams without replacing existing employees.
- The event catalogue contains 192 scenarios, up from 96: the added half explores parent-company interventions, commercial ownership and technical sign-off disputes around the operational issues. There are 177 normal arrivals and 15 chained follow-ups. Political event choices have different immediate and delayed consequences.
- Routine email arrives every 65-90 simulation seconds, instead of roughly 17-29. Leadership chat exchanges run every 25 seconds, and employee complaint opportunities every 45 seconds while fewer than three are open. Follow-up mail keeps its own deadlines.
- Offices now span 1600 by 1056 world pixels (previously 1280 by 864), with an east wing for BDMs and Specialists, a longer connecting corridor and a parent-company visiting suite. London and Cape Town retain their distinct furnishings and room arrangements.
- S.L.U.T. meeting invitations arrive in chat and the floor agenda. Meetings alternate between Cape Town and London, announce 100 seconds in advance, and stay open for 90 seconds. Attendance in the actual room earns 25 points once; three evidence-based political rounds can add 15 points each. Back the MD, back the CEO team, or establish the record as appropriate to the evidence. Wrong moves add accountability, and either executive can lose favour. Bonuses feed the existing leadership score, capped at 6000.
- The external CEO Team comprises Radish (executive urgency), Ledger (assurance) and Velvet (strategy). Radish has a custom radish-headed sprite. His six urgent request types require an in-person visit to his current office; missing one adds accountability. CEO favour below 25 increases request frequency and triggers assurance penalties, while high favour spaces requests out. The MD openly resents him in chat.
- The agenda and travel desk name the destination and deadline for meetings and CEO-team summons, making international trips an explicit part of the career rather than optional sightseeing.
- Walk in London and Cape Town using WASD, arrow keys, floor clicks or mobile direction controls. Click staff to approach and talk; E interacts nearby.
- Open the laptop with L or its button. Mail, Chat, Teams, People, Board, Reports and Staff Survey still operate while the company clock runs.
- Reach the travel desk to buy a flight. Travel takes 30 simulation seconds, costs GBP 2,500 and leaves both offices running. The laptop remains available in flight.
- Resolve nine kinds of local dilemmas and nine kinds of MD directives. Character perks and your chosen team affect outcomes.
- Balance separate office corruption levels against personal accountability and MD favour. There is no appointment deadline. Reaching 100 accountability or zero annualised company turnover ends the career; zero accountability is desirable but does not end play.
- Both offices have stock rooms with animated logistics employees, inventory counts, verified stock, dispatch totals and lost consignments. Open logistics requests hold dispatch at their assigned office. Expired requests lose 12 available units, GBP 60,000 annualised turnover and add 2 accountability. Resolved requests release the hold but require a fresh count; the original email decision effects also apply.
- Active logistics staff count every 20 simulation seconds and dispatch each business week. No available stock team means no counting or shipping. Supplier deliveries arrive every two weeks when staffed. Shipments add GBP 1,000 annualised turnover per unit, not instant cash.
- The stock-room toolbar button walks to the dispatch board. Existing timed world saves migrate to ongoing careers, paused on reload. An old time-completed appointment can resume unless a failure threshold was reached.
- Space pauses; Help explains the rules; Restart Career starts character selection again.

The MD is entirely fictional. His substance abuse, reversals and demands are satirical characterisation, not a portrayal of a real person.

## Development

Run `npm install`, then `npm run dev -- --host 127.0.0.1 --port 5180`.
Run `npm test -- --run`, `npm run lint`, `npm run build` and `npx playwright test` for verification. Browser tests target the new world entry screen; legacy laptop-only browser specs are retained but not selected by this fork's configuration.

The fork uses independent local storage (`slut-world-save-v1`) and does not overwrite saves from the original laptop game.

This is a first playable world, not a construction simulator. Office layouts are fixed, staff have lightweight animated routines, and the floor roster refreshes when entering an office. Building tools and deeper staff schedules are future work.
