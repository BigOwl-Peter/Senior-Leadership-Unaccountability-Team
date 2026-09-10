import type {
  Candidate,
  DepartmentId,
  Employee,
  OfficeId,
} from '../models/game';
import { firstNames, surnames, traits } from '../data/people';
import { departmentDefinitions } from '../data/departments';
import { randomFor } from './random';
export function generateEmployee(
  seed: string,
  id: string,
  departmentId: DepartmentId,
  officeId: OfficeId,
): Employee {
  const rng = randomFor(seed, `employee-${id}`);
  const available = Object.keys(traits);
  const selected: string[] = [];
  const count = rng.int(1, 3);
  while (selected.length < count) {
    const trait = available[rng.int(0, available.length - 1)];
    if (!selected.includes(trait)) selected.push(trait);
  }
  const skill = () => rng.int(30, 90);
  return {
    id,
    firstName: firstNames[rng.int(0, firstNames.length - 1)],
    surname: surnames[rng.int(0, surnames.length - 1)],
    officeId,
    departmentId,
    jobTitle: departmentDefinitions.find((d) => d.id === departmentId)!.title,
    salary: rng.int(28, 65) * 1000,
    competence: rng.int(40, 90),
    capacity: rng.int(65, 95),
    workload: 0,
    morale: rng.int(60, 85),
    stress: rng.int(10, 25),
    politicalInfluence: Math.min(
      100,
      rng.int(5, 60) +
        selected.reduce((s, t) => s + (traits[t].influence ?? 0), 0),
    ),
    customerSkill: skill(),
    complianceSkill: skill(),
    technicalSkill: skill(),
    salesSkill: skill(),
    loyalty: rng.int(35, 90),
    visibility: rng.int(10, 80),
    absenceRisk: 0,
    resignationRisk: 0,
    traits: selected,
    status: 'active',
    promotionLevel: 0,
    history: [{ turn: 0, text: 'Joined the organisation.' }],
  };
}
export function generateCandidates(seed: string, turn: number): Candidate[] {
  return Array.from({ length: 6 }, (_, index) => {
    const role = (['junior', 'specialist', 'manager'] as const)[index % 3];
    const employee = generateEmployee(
      seed,
      `candidate-${turn}-${index}`,
      departmentDefinitions[(turn + index) % 9].id,
      'albion',
    );
    const rng = randomFor(seed, `interview-${turn}-${index}`);
    const estimate = Math.min(
      95,
      Math.max(15, employee.competence + rng.int(-12, 12)),
    );
    employee.salary =
      role === 'junior' ? 32000 : role === 'specialist' ? 52000 : 85000;
    return {
      id: employee.id,
      employee,
      role,
      competenceEstimate: [
        Math.max(0, estimate - 12),
        Math.min(100, estimate + 12),
      ],
      leadTime: role === 'junior' ? 1 : role === 'specialist' ? 2 : 3,
      interview: [
        'Described a spreadsheet as a strategic asset.',
        'Gave a reassuringly specific answer about the actual work.',
        'Used the word transformation seven times.',
        'Asked who would be responsible for the things they deliver.',
        'Has experience managing expectations downwards.',
        'References describe them as a strong presence in meetings.',
      ][rng.int(0, 5)],
    };
  });
}
