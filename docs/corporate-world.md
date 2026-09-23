# Corporate World Fork

Isolated 2D office-satire branch: `codex/corporate-world`.
The original management prototype and GitHub Pages deployment remain unchanged.

This fork reuses the existing company simulation and laptop interface, including the Staff Survey. The new floor-level career adds two walkable offices, player identity, local corruption, MD orders, conversations and travel.

## Playable Slice

- Choose one of four executives, a name, a team and a 10- or 20-minute shift.
- Walk in London and Cape Town using WASD, arrow keys, floor clicks or mobile direction controls. Click staff to approach and talk; E interacts nearby.
- Open the laptop with L or its button. Mail, Chat, Teams, People, Board, Reports and Staff Survey still operate while the company clock runs.
- Reach the travel desk to buy a flight. Travel takes 30 simulation seconds, costs GBP 2,500 and leaves both offices running. The laptop remains available in flight.
- Resolve nine kinds of local dilemmas and nine kinds of MD directives. Character perks and your chosen team affect outcomes.
- Balance separate office corruption levels against personal accountability and MD favour. Finishing with zero accountability and neither office at 70 corruption or more is a successful escape.
- Space pauses; Help explains the rules; Restart Career starts character selection again.

The MD is entirely fictional. His substance abuse, reversals and demands are satirical characterisation, not a portrayal of a real person.

## Development

Run `npm install`, then `npm run dev -- --host 127.0.0.1 --port 5180`.
Run `npm test -- --run`, `npm run lint`, `npm run build` and `npx playwright test` for verification. Browser tests target the new world entry screen; legacy laptop-only browser specs are retained but not selected by this fork's configuration.

The fork uses independent local storage (`slut-world-save-v1`) and does not overwrite saves from the original laptop game. No public deployment has been changed.

This is a first playable world, not a construction simulator. Office layouts are fixed, staff have lightweight animated routines, and the floor roster refreshes when entering an office. Building tools, deeper schedules and distinct office layouts are future work.
