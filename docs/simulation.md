# Phase 3 simulation notes

These notes describe the underlying accounting engine. The user-facing interaction is now the [real-time inbox](realtime.md); weeks resolve automatically rather than waiting for a Close Week command.

## Time and money

Turn 1 is the first decision week, not an already simulated week. The initial chart point is week 0. There are exactly 20 weekly resolutions and 21 history points. Finished states reject new decisions and transfers; further turn processing returns the same state.

Turnover is annualised revenue in GBP. Weekly revenue is turnover / 52. Salaries are annual, divided by 52 for payroll. Product cost is 64% of weekly revenue; operating cost is GBP 85,000/week; shipping costs GBP 32/order. Choice costs are one-off and are cleared after financial resolution. Profit is weekly, cash is cumulative, and neither contributes directly to the leadership score.

## Capacity and workload

Effective capacity = nominal capacity * (0.75 + relevant skill / 200) * (0.55 + competence / 200) * (0.65 + morale / 285.714) * (1 - stress / 250) * product of trait modifiers.

Only active and notice employees produce capacity. Phase 4 adds 15 mechanical traits and seeded stress-related absence and resignation. See [personnel notes](phases456.md) for the employment lifecycle.

Initial baseline workload is 84-94% of generated capacity. Decisions and delayed effects add work. Performance is min(100, 100 / load ratio). Zero-capacity departments with outstanding work use a finite critical load ratio of 3. Half of unfinished work carries forward, alongside baseline work for the next week. Rising turnover adds demand pressure to Operations, Logistics and Customer Service. This is a coarse aggregate model, not per-order production accounting.

Stress rises under overload and falls during spare capacity. Morale rises slowly under manageable workloads and falls with overload or high stress. Capacity for the resolved week uses the starting employee state; the updated staff state feeds the next week. Department operational-health snapshots measure the resolved week; current department tables show the next week's projected load.

## Commercial systems

Logistics effectiveness and compliance exposure determine shipping success. Late shipments and overloaded service teams create complaints. Service performance and backlog affect satisfaction. Operations and shipping determine the sample product's availability.

Turnover combines prior turnover (including explicit decision effects), sales performance, customer retention, product availability and a small seeded market variation. The calculation is deliberately incremental so growth can coexist with declining operational health. The product record is a sample model; a full product launch simulation is later scope.

Approval rewards turnover growth and penalises high personal accountability. Operational collapse and high compliance exposure increase accountability. Committee and consulting decisions lower personal exposure while adding costs and delayed work.

## Prototype decisions and transfers

The legacy weekly engine offers one scenario per week; the playable live scheduler instead uses overlapping requests and the expanded event deck. Choices cannot be applied twice. Generic effects are centralised. Scheduled weekly consequences resolve before that week's employee and workload calculations. Pending effects beyond week 20 are not silently converted to an extra turn.

Live personnel actions share a three-action weekly allowance. An office transfer costs GBP 5,000, adds 2 accountability, reduces morale by 4 and raises stress by 8. Department-only transfers cost GBP 1,000 and reduce morale by 2. Skills remain unchanged, but the new department's relevant skill changes effective capacity. Headcounts are derived from employment records. The old one-transfer command remains only for legacy engine compatibility.

## Reproducibility and limits

The fixed seed controls initial staff, office objective, scenario order and market variation. The random library is seedrandom; independent named streams isolate systems. The engine has no Math.random, Date or browser APIs. Metadata timestamps exist only in the application store's high-score records.

Balance constants are provisional. Tests check deterministic results, accounting identities, relative consequences, legal transitions and finite bounded outputs across three strategies and fifteen seeds. This is not the phase 13 10,000-run balancing exercise. The deck now has 27 standard scenarios and 15 follow-ups.
