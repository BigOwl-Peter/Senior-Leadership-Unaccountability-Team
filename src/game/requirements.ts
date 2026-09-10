import type { EventChoice, GameEvent, GameState } from '../models/game';
import { loadRatio } from './systems';
export function choiceUnavailable(
  state: GameState,
  choice: EventChoice,
): string | undefined {
  const requirement = choice.requirements;
  if (!requirement) return;
  if (
    requirement.minCash !== undefined &&
    state.company.cash - state.company.pendingCosts < requirement.minCash
  )
    return `Requires GBP ${requirement.minCash.toLocaleString('en-GB')} uncommitted cash.`;
  if (
    requirement.minStaff !== undefined &&
    state.employees.filter(
      (e) =>
        e.departmentId === requirement.departmentId && e.status === 'active',
    ).length < requirement.minStaff
  )
    return `Requires ${requirement.minStaff} active staff in ${requirement.departmentId}.`;
}
export function eventEligible(state: GameState, event: GameEvent) {
  const r = event.requirements;
  if (!r) return true;
  return (
    (r.minTurn === undefined || state.turn >= r.minTurn) &&
    (r.minRisk === undefined || state.metrics.complianceRisk >= r.minRisk) &&
    (r.maxMorale === undefined || state.metrics.morale <= r.maxMorale) &&
    (r.minNotice === undefined ||
      state.employees.filter((e) => e.status === 'notice').length >=
        r.minNotice) &&
    (r.minLoad === undefined ||
      loadRatio(state.departments.find((d) => d.id === event.departmentId)!) >=
        r.minLoad)
  );
}
