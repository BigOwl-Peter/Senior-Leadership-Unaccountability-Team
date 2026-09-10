import { useGameStore } from '../stores/gameStore';
import { type Policy } from '../game/organisation';
import type { DepartmentId } from '../models/game';
export { EmployeeChat } from './ChatWorkspace';

export function TeamMandate({
  id,
  onOpenEmployee,
}: {
  id: DepartmentId;
  onOpenEmployee: (id: string) => void;
}) {
  const { session, setTeamPolicy } = useGameStore();
  const team = session.organisation?.teams.find((t) => t.id === id);
  const members = session.game.employees.filter(
    (e) =>
      e.departmentId === id &&
      ['active', 'notice', 'absent'].includes(e.status),
  );
  return (
    <div className="team-mandate">
      <label>
        Team mandate{' '}
        <select
          aria-label="Team mandate"
          value={team?.policy ?? 'balanced'}
          disabled={
            session.game.status === 'finished' ||
            (team?.week === session.game.turn && team.changes >= 1)
          }
          onChange={(e) => setTeamPolicy(id, e.target.value as Policy)}
        >
          <option value="balanced">Balanced delivery</option>
          <option value="growth">Growth / extra work and risk</option>
          <option value="quality">Quality / extra cost and checks</option>
          <option value="people">Protect people / lower turnover</option>
        </select>
      </label>
      <span>Team trust: {Math.round(team?.trust ?? 60)} / 100</span>
      <details>
        <summary>{members.length} team members</summary>
        <ul>
          {members.map((e) => (
            <li key={e.id}>
              <button
                className="person-name"
                onClick={() => onOpenEmployee(e.id)}
                aria-label={`View ${e.firstName} ${e.surname}`}
              >
                {e.firstName} {e.surname}
              </button>{' '}
              · {e.jobTitle} · {e.status}
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
export function BusinessPressure() {
  const org = useGameStore((s) => s.session.organisation);
  return (
    <section className="business-pressure">
      <h2>Delivery & commercial exposure</h2>
      <dl className="ledger">
        {[
          ['Delivery backlog', Math.round(org?.backlog ?? 0)],
          ['Product defects', `${Math.round(org?.defects ?? 5)} / 100`],
          ['Regulatory exposure', `${Math.round(org?.exposure ?? 0)} / 100`],
          ['Accounts lost', org?.lostAccounts ?? 0],
        ].map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <p>{org?.lastIncident ?? 'No material incidents reported.'}</p>
    </section>
  );
}
