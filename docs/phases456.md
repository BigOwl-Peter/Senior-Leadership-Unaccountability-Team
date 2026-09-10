# Phases 4-6 testing build

## Employees

Employees are seeded with skills, competence, influence, loyalty and 1-3 traits. Traits modify output, stress growth or initial influence. Profiles expose these values and employment history. Promotions raise salary 20%, morale 12 and influence 10 but reduce nominal capacity 8% through meeting overhead; competence does not improve. Each employee can be promoted twice.

Redundancy removes actual headcount, capacity and future payroll immediately. Severance is one sixth of annual salary. Accountability depends on influence and the Untouchable trait; protected status adds compliance exposure. Remaining staff lose morale. Transfers can change department and office, so skills and departmental bottlenecks matter.

Weekly seeded rolls can cause stress-related absence for 1-2 weeks or resignation with two weeks' notice. Absent employees remain on payroll but provide no capacity. Notice employees work until departure. An GBP 8,000 retention payment with an 8% salary increase withdraws notice and improves loyalty, morale and stress. Three personnel actions refresh each business week.

## Events

There are 27 standard events and 15 follow-up events. Standard arrivals prefer the least-seen eligible scenarios and cannot duplicate an open event. Eligibility can depend on week, morale, notice, risk or load. Choice requirements are checked in the UI and pure engine; currently the consulting retainer demonstrates a cash gate.

Choices can schedule specific follow-ups, sometimes probabilistically, using independent seeded streams. A follow-up retains the originating request ID and offers navigation back to the decision. Some outcomes branch a second time. Existing weekly delayed effects still settle through accounting; live follow-up requests are separate decisions, not duplicate financial effects.

At most three ordinary requests or four including follow-ups are open. Queued follow-ups wait for capacity. In the final twenty seconds, remaining branches are explicitly handed to the next appointment instead of extending the session. Branch state survives save/resume.

## Offices and recruitment

Six candidates refresh weekly across junior, specialist and manager roles. Interviews expose noisy competence estimates, not guaranteed actual ability. A hire costs GBP 6,000 upfront and joins after 1, 2 or 3 business weeks respectively. Only actual arrivals affect headcount, capacity and payroll; an offer alone cannot satisfy a mandate. Withdrawing an offer uses an action and does not refund the fee. Offers arriving beyond week 20 are blocked.

Offices show employed headcount, annual payroll, incoming hires and departmental distribution. Mandates vary between a six-person lead, a 20% ratio lead, growing one office while shrinking the other, and consolidating Customer Service in one office with at least five retained employees. Profit remains excluded from direct leadership scoring.

## Verification and limits

Unit tests cover deterministic generation, employment transitions, costs, weekly limits, hiring dates, mandate rules, event diversity, branching, prerequisites and additive save migration. Browser tests exercise the new controls and desktop/mobile layouts alongside the existing timed inbox tests.

These systems are playable prototypes, not final balancing. No real HR, email, Teams or recruitment services are contacted. All characters, conversations and consequences are generated or authored game content.
