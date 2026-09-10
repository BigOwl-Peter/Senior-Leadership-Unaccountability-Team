import type {
  Department,
  Employee,
  GameState,
  BoardObjective,
} from '../models/game';
import { traits } from '../data/people';
export const clamp = (value: number, min = 0, max = 100) =>
  Math.min(max, Math.max(min, value));
export function employeeCapacity(e: Employee): number {
  if (e.status !== 'active' && e.status !== 'notice') return 0;
  const trait = e.traits.reduce(
    (v, name) => v * (traits[name]?.output ?? 1),
    1,
  );
  const skill =
    e.departmentId === 'sales'
      ? e.salesSkill
      : e.departmentId === 'service'
        ? e.customerSkill
        : e.departmentId === 'compliance'
          ? e.complianceSkill
          : e.technicalSkill;
  return (
    e.capacity *
    (0.75 + skill / 200) *
    (0.55 + e.competence / 200) *
    (0.65 + e.morale / 285.714) *
    (1 - e.stress / 250) *
    trait
  );
}
export const loadRatio = (d: Department) =>
  d.capacity > 0 ? d.workload / d.capacity : d.workload > 0 ? 3 : 0;
export function updateDepartments(state: GameState) {
  for (const d of state.departments) {
    for (const e of state.employees.filter(
      (e) =>
        e.departmentId === d.id && !['active', 'notice'].includes(e.status),
    ))
      e.workload = 0;
    const employees = state.employees.filter(
      (e) =>
        e.departmentId === d.id &&
        (e.status === 'active' || e.status === 'notice'),
    );
    d.capacity = employees.reduce((sum, e) => sum + employeeCapacity(e), 0);
    d.performance = clamp(100 / Math.max(1, loadRatio(d)));
    for (const employee of employees) {
      employee.workload = employeeCapacity(employee) * loadRatio(d);
    }
    d.officePresence = {
      albion: state.employees.filter(
        (e) =>
          e.departmentId === d.id &&
          e.officeId === 'albion' &&
          ['active', 'notice', 'absent'].includes(e.status),
      ).length,
      continental: state.employees.filter(
        (e) =>
          e.departmentId === d.id &&
          e.officeId === 'continental' &&
          ['active', 'notice', 'absent'].includes(e.status),
      ).length,
    };
    if (!employees.some((e) => e.id === d.managerId))
      d.managerId = [...employees].sort(
        (a, b) => b.politicalInfluence - a.politicalInfluence,
      )[0]?.id;
  }
}
export const headcount = (state: GameState, office?: string) =>
  state.employees.filter(
    (e) =>
      (e.status === 'active' ||
        e.status === 'notice' ||
        e.status === 'absent') &&
      (!office || e.officeId === office),
  ).length;
export function teamLeadName(state: GameState, id: string) {
  const department = state.departments.find((d) => d.id === id);
  const manager = state.employees.find(
    (e) => e.id === department?.managerId && e.status === 'active',
  );
  return manager
    ? `${manager.firstName} ${manager.surname}`
    : `${department?.name ?? id} duty desk`;
}
export function objectiveMet(
  state: GameState,
  objective: BoardObjective,
): boolean {
  if (objective.metric === 'turnover')
    return state.metrics.turnover >= objective.target;
  if (objective.metric === 'accountability')
    return state.metrics.accountability <= objective.target;
  const target = headcount(state, objective.officeId);
  const other = headcount(
    state,
    objective.officeId === 'albion' ? 'continental' : 'albion',
  );
  if (objective.officeRule === 'ratio')
    return target > 0 && target >= Math.ceil(other * objective.target);
  if (objective.officeRule === 'grow-shrink')
    return (
      target >= (objective.initialTargetHeadcount ?? 0) + objective.target &&
      other <= (objective.initialOtherHeadcount ?? 0) - objective.target
    );
  if (objective.officeRule === 'consolidate') {
    const members = state.employees.filter(
      (e) =>
        e.departmentId === objective.departmentId &&
        ['active', 'notice', 'absent'].includes(e.status),
    );
    return (
      members.length >= objective.target &&
      members.every((e) => e.officeId === objective.officeId)
    );
  }
  return (
    headcount(state, objective.officeId) -
      headcount(
        state,
        objective.officeId === 'albion' ? 'continental' : 'albion',
      ) >=
    objective.target
  );
}
export function decisionSpeedScore(state: GameState) {
  const tempo = state.decisionTempo;
  return tempo?.count
    ? Math.round(600 * clamp(tempo.total / tempo.count, -1, 1))
    : 0;
}
export function leadershipScore(state: GameState) {
  const m = state.metrics;
  const board = state.boardObjectives.filter((o) => o.metric !== 'office');
  const office = state.boardObjectives.find((o) => o.metric === 'office');
  const base = Math.round(
    6000 *
      (0.3 * clamp(m.turnover / (state.company.initialTurnover * 1.2), 0, 1) +
        0.2 *
          (board.filter((o) => objectiveMet(state, o)).length /
            Math.max(1, board.length)) +
        0.15 * (office && objectiveMet(state, office) ? 1 : 0) +
        (0.15 * m.executiveApproval) / 100 +
        (0.1 * (100 - m.accountability)) / 100 +
        (0.05 * m.customerSatisfaction) / 100 +
        (0.05 * m.operationalHealth) / 100),
  );
  return clamp(base + decisionSpeedScore(state), 0, 6000);
}
export function rating(score: number) {
  return [
    'Asked To Leave Immediately',
    'Performance Improvement Plan',
    'Middle Management Material',
    'Senior Leadership Potential',
    'Strategic Visionary',
    'Completely Unaccountable',
  ][Math.min(5, Math.floor(score / 1000))];
}
