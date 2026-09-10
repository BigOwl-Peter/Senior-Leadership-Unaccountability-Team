import type { GameState } from '../models/game';
import { employeeCapacity } from './systems';
import { employed } from './personnel';

// Office figures allocate the consolidated business, not separate sales ledgers.
export function officeSummaries(game: GameState) {
  const capacity = game.offices.map((o) =>
    game.employees
      .filter((e) => e.officeId === o.id)
      .reduce((sum, e) => sum + employeeCapacity(e), 0),
  );
  const total = capacity.reduce((a, b) => a + b, 0);
  const employedCount = game.employees.filter(employed).length;
  let allocated = 0;
  return game.offices.map((office, i) => {
    const people = game.employees.filter((e) => e.officeId === office.id);
    const active = people.filter(employed);
    const share =
      total > 0
        ? capacity[i] / total
        : employedCount
          ? active.length / employedCount
          : 1 / game.offices.length;
    const turnover =
      i === game.offices.length - 1
        ? game.metrics.turnover - allocated
        : Math.round(game.metrics.turnover * share);
    allocated += turnover;
    return {
      ...office,
      headcount: active.length,
      turnover,
      payroll: active.reduce((sum, e) => sum + e.salary, 0),
      joining: game.recruitment.filter(
        (r) => r.status === 'pending' && r.employee.officeId === office.id,
      ).length,
      joined: game.recruitment.filter(
        (r) =>
          r.status === 'joined' && people.some((e) => e.id === r.employee.id),
      ).length,
      notice: people.filter((e) => e.status === 'notice').length,
      left: people.filter((e) => ['resigned', 'redundant'].includes(e.status))
        .length,
      absent: people.filter((e) => e.status === 'absent').length,
    };
  });
}
