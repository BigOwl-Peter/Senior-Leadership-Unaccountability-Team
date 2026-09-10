import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeftRight,
  Eye,
  HandHeart,
  TrendingUp,
  UserMinus,
  UserPlus,
  X,
} from 'lucide-react';
import type { DepartmentId, OfficeId } from '../models/game';
import { useGameStore } from '../stores/gameStore';
import { employeeCapacity, headcount, objectiveMet } from '../game/systems';
import {
  employed,
  redundancyTerms,
  type PersonnelAction,
} from '../game/personnel';
import { departmentDefinitions } from '../data/departments';
import { traits } from '../data/people';
import { money, number } from '../utils/format';
import { officeSummaries } from '../game/officeSummary';
export function PeopleOffice({
  initialEmployeeId,
}: {
  initialEmployeeId?: string | null;
}) {
  const { session, manage } = useGameStore();
  const game = session.game;
  const [tab, setTab] = useState('Directory');
  const [query, setQuery] = useState('');
  const [office, setOffice] = useState('all');
  const [status, setStatus] = useState('employed');
  const [selected, setSelected] = useState<string | null>(
    initialEmployeeId ?? null,
  );
  const [action, setAction] = useState<
    'profile' | 'transfer' | 'promote' | 'redundancy' | 'retain'
  >('profile');
  const [destination, setDestination] = useState<OfficeId>('continental');
  const [department, setDepartment] = useState<DepartmentId>('operations');
  const [hireOffice, setHireOffice] = useState<OfficeId>('albion');
  const [hireDepartment, setHireDepartment] =
    useState<DepartmentId>('operations');
  const [offerId, setOfferId] = useState<string | null>(null);
  const modal = useRef<HTMLDialogElement>(null);
  const offerModal = useRef<HTMLDialogElement>(null);
  const employee = game.employees.find((e) => e.id === selected);
  useEffect(() => {
    if (initialEmployeeId) modal.current?.showModal();
  }, [initialEmployeeId]);
  const candidate = game.candidates.find((c) => c.id === offerId);
  const disabled =
    game.status === 'finished' || game.personnelActionsLeft === 0;
  const open = (id: string, type: typeof action) => {
    const e = game.employees.find((e) => e.id === id)!;
    setSelected(id);
    setAction(type);
    setDestination(e.officeId === 'albion' ? 'continental' : 'albion');
    setDepartment(e.departmentId);
    modal.current?.showModal();
  };
  const execute = () => {
    if (!employee || action === 'profile') return;
    const command: PersonnelAction =
      action === 'transfer'
        ? {
            type: 'transfer',
            employeeId: employee.id,
            officeId: destination,
            departmentId: department,
          }
        : { type: action, employeeId: employee.id };
    manage(command);
    modal.current?.close();
  };
  const officeSelect = (
    value: OfficeId,
    onChange: (id: OfficeId) => void,
    label: string,
  ) => (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value as OfficeId)}
    >
      {game.offices.map((o) => (
        <option value={o.id} key={o.id}>
          {o.name}
        </option>
      ))}
    </select>
  );
  const departmentSelect = (
    value: DepartmentId,
    onChange: (id: DepartmentId) => void,
    label: string,
  ) => (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value as DepartmentId)}
    >
      {departmentDefinitions.map((d) => (
        <option value={d.id} key={d.id}>
          {d.name}
        </option>
      ))}
    </select>
  );
  const people = game.employees.filter(
    (e) =>
      (office === 'all' || e.officeId === office) &&
      (status === 'all' ||
        (status === 'employed' && employed(e)) ||
        status === e.status) &&
      `${e.firstName} ${e.surname} ${e.jobTitle}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const mandate = game.boardObjectives.find((o) => o.metric === 'office')!;
  return (
    <>
      <div className="personnel-summary">
        <div>
          <span>Employed</span>
          <strong>{headcount(game)}</strong>
        </div>
        <div>
          <span>Absent</span>
          <strong>
            {game.employees.filter((e) => e.status === 'absent').length}
          </strong>
        </div>
        <div>
          <span>Serving notice</span>
          <strong>
            {game.employees.filter((e) => e.status === 'notice').length}
          </strong>
        </div>
        <div>
          <span>Joining soon</span>
          <strong>
            {game.recruitment.filter((r) => r.status === 'pending').length}
          </strong>
        </div>
        <div>
          <span>Management capacity</span>
          <strong>
            {game.personnelActionsLeft}
            <small> actions this week</small>
          </strong>
        </div>
      </div>
      <div
        className="people-tabs"
        role="tablist"
        aria-label="People and office views"
      >
        {['Directory', 'Recruitment', 'Offices', 'Movements'].map((name) => (
          <button
            key={name}
            role="tab"
            aria-selected={tab === name}
            onClick={() => setTab(name)}
          >
            {name}
          </button>
        ))}
      </div>
      {tab === 'Movements' && (
        <section className="workforce-movements">
          <h2>Joiners & leavers</h2>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Office</th>
                  <th>Movement</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {game.recruitment
                  .filter((r) => r.status !== 'cancelled')
                  .map((r) => (
                    <tr key={r.id}>
                      <th>
                        {r.employee.firstName} {r.employee.surname}
                      </th>
                      <td>{r.employee.officeId}</td>
                      <td>{r.status === 'pending' ? 'Joining' : 'Joined'}</td>
                      <td>Week {r.dueTurn}</td>
                    </tr>
                  ))}
                {game.employees
                  .filter((e) =>
                    ['notice', 'resigned', 'redundant', 'absent'].includes(
                      e.status,
                    ),
                  )
                  .map((e) => (
                    <tr key={e.id}>
                      <th>
                        <button
                          className="person-name"
                          onClick={() => open(e.id, 'profile')}
                        >
                          {e.firstName} {e.surname}
                        </button>
                      </th>
                      <td>{e.officeId}</td>
                      <td>
                        {e.status === 'notice'
                          ? 'Leaving / retention possible'
                          : e.status === 'absent'
                            ? 'Absent'
                            : 'Left / ' + e.status}
                      </td>
                      <td>
                        {e.status === 'notice'
                          ? `Week ${e.departureTurn}`
                          : e.status === 'absent'
                            ? `Returns week ${e.returnTurn}`
                            : `Week ${e.history?.at(-1)?.turn ?? game.turn}`}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <h2>Recent people activity</h2>
          {game.eventHistory
            .filter((e) => e.type === 'personnel')
            .slice(-20)
            .reverse()
            .map((e, i) => (
              <p key={i}>
                <strong>Week {e.turn}</strong> · {e.title}
              </p>
            ))}
          {!game.eventHistory.some((e) => e.type === 'personnel') && (
            <p>No workforce changes recorded yet.</p>
          )}
        </section>
      )}
      {tab === 'Directory' && (
        <>
          <div className="people-filters">
            <input
              aria-label="Search people"
              placeholder="Search people or roles"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <select
              aria-label="Filter office"
              value={office}
              onChange={(e) => setOffice(e.target.value)}
            >
              <option value="all">All offices</option>
              {game.offices.map((o) => (
                <option value={o.id} key={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
            <select
              aria-label="Filter employment status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="employed">Current employees</option>
              <option value="active">Active</option>
              <option value="absent">Absent</option>
              <option value="notice">Serving notice</option>
              <option value="all">Including leavers</option>
            </select>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Employee / role</th>
                  <th>Office</th>
                  <th>Status</th>
                  <th>Capacity</th>
                  <th>Morale / stress</th>
                  <th>Salary</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {people.map((e) => (
                  <tr key={e.id}>
                    <th>
                      <button
                        className="person-name"
                        onClick={() => open(e.id, 'profile')}
                      >
                        {e.firstName} {e.surname}
                      </button>
                      <small>{e.jobTitle}</small>
                    </th>
                    <td className="capitalize">{e.officeId}</td>
                    <td>
                      <span className={`employee-status ${e.status}`}>
                        {e.status}
                      </span>
                    </td>
                    <td>{number(employeeCapacity(e))}</td>
                    <td>
                      {number(e.morale)} / {number(e.stress)}
                    </td>
                    <td>{money(e.salary)}</td>
                    <td>
                      <div className="person-actions">
                        <button
                          className="icon-button"
                          title="Employee profile"
                          aria-label={`View ${e.firstName} ${e.surname}`}
                          onClick={() => open(e.id, 'profile')}
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          className="icon-button"
                          title="Transfer office or department"
                          aria-label={`Transfer ${e.firstName} ${e.surname}`}
                          disabled={disabled || e.status !== 'active'}
                          onClick={() => open(e.id, 'transfer')}
                        >
                          <ArrowLeftRight size={16} />
                        </button>
                        <button
                          className="icon-button"
                          title="Promote: salary +20%, capacity -8%"
                          aria-label={`Promote ${e.firstName} ${e.surname}`}
                          disabled={
                            disabled ||
                            e.status !== 'active' ||
                            (e.promotionLevel ?? 0) >= 2
                          }
                          onClick={() => open(e.id, 'promote')}
                        >
                          <TrendingUp size={16} />
                        </button>
                        {e.status === 'notice' && (
                          <button
                            className="icon-button"
                            title="Retention offer"
                            aria-label={`Retain ${e.firstName} ${e.surname}`}
                            disabled={disabled}
                            onClick={() => open(e.id, 'retain')}
                          >
                            <HandHeart size={16} />
                          </button>
                        )}
                        <button
                          className="icon-button danger-action"
                          title="Make redundant"
                          aria-label={`Make ${e.firstName} ${e.surname} redundant`}
                          disabled={disabled || !employed(e)}
                          onClick={() => open(e.id, 'redundancy')}
                        >
                          <UserMinus size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!people.length && (
              <p className="empty-inbox">No employees match these filters.</p>
            )}
          </div>
        </>
      )}
      {tab === 'Recruitment' && (
        <>
          <div className="recruit-controls">
            <label>
              Destination office
              {officeSelect(hireOffice, setHireOffice, 'Recruitment office')}
            </label>
            <label>
              Hiring department
              {departmentSelect(
                hireDepartment,
                setHireDepartment,
                'Recruitment department',
              )}
            </label>
            <span>Recruitment fee {money(6000)} per accepted offer</span>
          </div>
          <div className="candidate-grid">
            {game.candidates.map((c) => (
              <article key={c.id} className="candidate">
                <span className="candidate-role">{c.role}</span>
                <h3>
                  {c.employee.firstName} {c.employee.surname}
                </h3>
                <p>{c.interview}</p>
                <dl>
                  <div>
                    <dt>Expected competence</dt>
                    <dd>
                      {c.competenceEstimate[0]}-{c.competenceEstimate[1]}
                    </dd>
                  </div>
                  <div>
                    <dt>Annual salary</dt>
                    <dd>{money(c.employee.salary)}</dd>
                  </div>
                  <div>
                    <dt>Available</dt>
                    <dd>Week {game.turn + c.leadTime}</dd>
                  </div>
                </dl>
                <button
                  disabled={disabled || game.turn + c.leadTime > 20}
                  onClick={() => {
                    setOfferId(c.id);
                    offerModal.current?.showModal();
                  }}
                >
                  <UserPlus size={15} />
                  Make offer
                </button>
                {game.turn + c.leadTime > 20 && (
                  <small>Starts after this appointment ends</small>
                )}
              </article>
            ))}
          </div>
          {!game.candidates.length && (
            <p className="empty-inbox">
              The next candidate shortlist arrives next business week.
            </p>
          )}
          <h2>Recruitment pipeline</h2>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Office / team</th>
                  <th>Arrival</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {game.recruitment.map((r) => (
                  <tr key={r.id}>
                    <th>
                      {r.employee.firstName} {r.employee.surname}
                    </th>
                    <td className="capitalize">
                      {r.employee.officeId} / {r.employee.departmentId}
                    </td>
                    <td>Week {r.dueTurn}</td>
                    <td>{r.status}</td>
                    <td>
                      {r.status === 'pending' && (
                        <button
                          disabled={disabled}
                          onClick={() =>
                            manage({ type: 'cancel-hire', recruitmentId: r.id })
                          }
                        >
                          Withdraw offer
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!game.recruitment.length && (
              <p className="empty-inbox">No offers outstanding.</p>
            )}
          </div>
        </>
      )}
      {tab === 'Offices' && (
        <>
          <p>
            Office turnover is allocated from the company total by current
            employee capacity. The company still has one consolidated sales
            ledger.
          </p>
          <div className="office-mandate">
            <h2>Board mandate</h2>
            <p>{mandate.label}</p>
            <strong>
              {objectiveMet(game, mandate) ? 'On target' : 'Not yet achieved'}
            </strong>
          </div>
          <div className="office-comparisons">
            {game.offices.map((o) => (
              <section key={o.id}>
                <h2>{o.name}</h2>
                <strong>
                  {headcount(game, o.id)} <small>employees</small>
                </strong>
                <p>
                  {money(
                    officeSummaries(game).find(
                      (summary) => summary.id === o.id,
                    )!.turnover,
                  )}{' '}
                  allocated annualised turnover
                </p>
                <p>
                  {money(
                    game.employees
                      .filter((e) => employed(e) && e.officeId === o.id)
                      .reduce((sum, e) => sum + e.salary, 0),
                  )}{' '}
                  annual payroll
                </p>
                <span>
                  {
                    game.recruitment.filter(
                      (r) =>
                        r.status === 'pending' && r.employee.officeId === o.id,
                    ).length
                  }{' '}
                  incoming hires
                </span>
              </section>
            ))}
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Department</th>
                  <th>Albion</th>
                  <th>Continental</th>
                  <th>Available capacity</th>
                </tr>
              </thead>
              <tbody>
                {game.departments.map((d) => (
                  <tr key={d.id}>
                    <th>{d.name}</th>
                    <td>{d.officePresence.albion}</td>
                    <td>{d.officePresence.continental}</td>
                    <td>{number(d.capacity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <dialog ref={modal} className="employee-dialog">
        <div className="dialog-heading">
          <h2>
            {action === 'profile'
              ? 'Employee record'
              : action === 'redundancy'
                ? 'Redundancy proposal'
                : action === 'promote'
                  ? 'Promotion approval'
                  : action === 'retain'
                    ? 'Retention offer'
                    : 'Transfer approval'}
          </h2>
          <button
            className="icon-button"
            aria-label="Close employee record"
            onClick={() => modal.current?.close()}
          >
            <X size={19} />
          </button>
        </div>
        {employee && (
          <>
            <h3>
              {employee.firstName} {employee.surname}
            </h3>
            <p>
              {employee.jobTitle} / {employee.officeId} / {employee.status}
            </p>
            {action === 'profile' ? (
              <>
                <div className="profile-stats">
                  {Object.entries({
                    Competence: employee.competence,
                    Morale: employee.morale,
                    Stress: employee.stress,
                    Influence: employee.politicalInfluence,
                    'Customer skill': employee.customerSkill,
                    'Compliance skill': employee.complianceSkill,
                    'Technical skill': employee.technicalSkill,
                    'Sales skill': employee.salesSkill,
                    Loyalty: employee.loyalty,
                  }).map(([label, value]) => (
                    <div key={label}>
                      <span>{label}</span>
                      <strong>{number(value)}</strong>
                    </div>
                  ))}
                </div>
                <h3>Traits</h3>
                {employee.traits.map((t) => (
                  <p className="trait-detail" key={t}>
                    <strong>{t}</strong>
                    <span>
                      {traits[t]?.description ?? 'No recorded modifier.'}
                    </span>
                  </p>
                ))}
                <h3>Employment history</h3>
                <div className="employment-history">
                  {employee.history?.map((h, i) => (
                    <p key={i}>
                      <b>W{h.turn}</b>
                      {h.text}
                    </p>
                  ))}
                </div>
              </>
            ) : (
              <>
                {action === 'transfer' && (
                  <>
                    <div className="recruit-controls">
                      <label>
                        Office
                        {officeSelect(
                          destination,
                          setDestination,
                          'Transfer destination',
                        )}
                      </label>
                      <label>
                        Department
                        {departmentSelect(
                          department,
                          setDepartment,
                          'Transfer department',
                        )}
                      </label>
                    </div>
                    <p>
                      Cost:{' '}
                      {money(employee.officeId === destination ? 1000 : 5000)}.
                      Accountability +2. Stress +8. Morale -
                      {employee.officeId === destination ? 2 : 4}. Department
                      skills affect the resulting capacity.
                    </p>
                  </>
                )}
                {action === 'promote' && (
                  <p>
                    New annual salary:{' '}
                    {money(Math.round(employee.salary * 1.2))}. Administration:{' '}
                    {money(1000)}. Morale +12, influence +10, nominal capacity
                    -8% for meetings. Competence does not increase.
                  </p>
                )}
                {action === 'retain' && (
                  <p>
                    Retention payment: {money(8000)}. Annual salary +8%. Loyalty
                    +20, morale +15, stress -25. Notice is withdrawn if accepted
                    before departure.
                  </p>
                )}
                {action === 'redundancy' && (
                  <div className="redundancy-details">
                    <p>
                      Severance:{' '}
                      <strong>
                        {money(redundancyTerms(employee).severance)}
                      </strong>
                    </p>
                    <p>
                      Annual salary saved: {money(employee.salary)}. Capacity
                      lost: {number(employeeCapacity(employee))}.
                    </p>
                    <p>
                      Accountability +{redundancyTerms(employee).accountability}
                      . Compliance risk +{redundancyTerms(employee).risk}.
                      Remaining staff morale -4. Board approval +4.
                    </p>
                    <p>This employee leaves immediately.</p>
                  </div>
                )}
                <div className="dialog-actions">
                  <button onClick={() => modal.current?.close()}>Cancel</button>
                  <button
                    className={
                      action === 'redundancy' ? 'destructive' : 'primary'
                    }
                    disabled={disabled || !employed(employee)}
                    onClick={execute}
                  >
                    Confirm {action}
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </dialog>
      <dialog ref={offerModal}>
        <div className="dialog-heading">
          <h2>Confirm employment offer</h2>
          <button
            className="icon-button"
            aria-label="Cancel offer"
            onClick={() => offerModal.current?.close()}
          >
            <X size={19} />
          </button>
        </div>
        {candidate ? (
          <>
            <p>
              {candidate.employee.firstName} {candidate.employee.surname} /{' '}
              {hireOffice} / {hireDepartment}
            </p>
            <p>
              {money(candidate.employee.salary)} annual salary, from week{' '}
              {game.turn + candidate.leadTime}. Recruitment fee: {money(6000)}.
              Interview estimates are not guaranteed.
            </p>
            <div className="dialog-actions">
              <button onClick={() => offerModal.current?.close()}>
                Cancel
              </button>
              <button
                className="primary"
                disabled={disabled}
                onClick={() => {
                  manage({
                    type: 'hire',
                    candidateId: candidate.id,
                    officeId: hireOffice,
                    departmentId: hireDepartment,
                  });
                  offerModal.current?.close();
                }}
              >
                Confirm offer
              </button>
            </div>
          </>
        ) : (
          <p>This candidate is no longer available.</p>
        )}
      </dialog>
    </>
  );
}
