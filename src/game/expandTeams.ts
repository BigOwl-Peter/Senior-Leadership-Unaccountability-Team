import { departmentDefinitions } from '../data/departments';
import type { LiveSession } from '../models/live';
import { generateEmployee } from './employees';
import { updateDepartments } from './systems';

export function expandTeams(s: Pick<LiveSession, 'game' | 'organisation'>) {
  for (const id of ['bdm', 'specialists'] as const) {
    if (s.game.departments.some((d) => d.id === id)) continue;
    const definition = departmentDefinitions.find((d) => d.id === id)!;
    s.game.departments.push({
      id,
      name: definition.name,
      workload: 0,
      baselineWorkload: 0,
      capacity: 0,
      performance: 100,
      budget: 100000,
      officePresence: { albion: 0, continental: 0 },
    });
    for (const office of ['albion', 'continental'] as const)
      for (let n = 0; n < 2; n++)
        s.game.employees.push(
          generateEmployee(
            s.game.seed,
            `expansion-${id}-${office}-${n}`,
            id,
            office,
          ),
        );
    s.organisation?.teams.push({
      id,
      policy: 'balanced',
      trust: 65,
      changes: 0,
      week: s.game.turn,
    });
    updateDepartments(s.game);
    const d = s.game.departments.find((d) => d.id === id)!;
    d.baselineWorkload = d.capacity * 0.75;
    d.workload = d.baselineWorkload;
  }
}
