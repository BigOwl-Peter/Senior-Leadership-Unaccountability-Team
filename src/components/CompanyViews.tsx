import { Check, Clock3 } from 'lucide-react';
import { useGameStore } from '../stores/gameStore';
import {
  leadershipScore,
  decisionSpeedScore,
  loadRatio,
  objectiveMet,
  rating,
} from '../game/systems';
import { money, millions, number } from '../utils/format';
import { TrendChart } from './TrendChart';
import { PeopleOffice } from './PeopleOffice';
import { BusinessPressure } from './OrganisationViews';
export function CompanyViews({
  view,
  initialEmployeeId,
}: {
  view: 'People' | 'Board' | 'Reports';
  initialEmployeeId?: string | null;
}) {
  const { session, restart, highScores } = useGameStore();
  const game = session.game;
  return (
    <section className="company-view">
      <div className="company-heading">
        <span>OMNIFORM GROUP</span>
        <h1>
          {view === 'People'
            ? 'People & offices'
            : view === 'Board'
              ? 'The boardroom'
              : 'Company performance'}
        </h1>
      </div>
      {view === 'People' && (
        <PeopleOffice initialEmployeeId={initialEmployeeId} />
      )}
      {view === 'Reports' && <BusinessPressure />}
      {view === 'Board' && (
        <>
          {game.status === 'finished' && (
            <div className="final-assessment">
              <span>FINAL ASSESSMENT</span>
              <strong>
                {number(leadershipScore(game))} <small>/ 6,000</small>
              </strong>
              <h2>{rating(leadershipScore(game))}</h2>
              <p>
                {session.requests.filter((r) => r.status === 'expired').length}{' '}
                missed sign-offs.{' '}
                {session.requests.filter((r) => r.delegatedTo).length} delegated
                decisions.
              </p>
              <button className="primary" onClick={() => restart(game.seed)}>
                Replay same seed
              </button>
              <p>Best local score: {number(highScores[0]?.score ?? 0)}</p>
            </div>
          )}
          <h2>
            Appointment mandate <span className="muted">/ end of session</span>
          </h2>
          <div className="board-objectives">
            {game.boardObjectives.map((o) => (
              <div key={o.id}>
                {objectiveMet(game, o) ? (
                  <Check size={20} />
                ) : (
                  <Clock3 size={20} />
                )}
                <span>
                  {o.label}
                  <small>
                    {objectiveMet(game, o) ? 'On target' : 'Not yet achieved'}
                  </small>
                </span>
              </div>
            ))}
          </div>
          <h2>Leadership assessment</h2>
          <p>Current score: {number(leadershipScore(game))} / 6,000</p>
          <p>
            Decision speed: {decisionSpeedScore(game) >= 0 ? '+' : ''}
            {number(decisionSpeedScore(game))} points /{' '}
            {game.decisionTempo?.count ?? 0} decisions assessed
          </p>
          <dl className="ledger">
            {[
              ['Turnover', '30%'],
              ['Board objectives', '20%'],
              ['Office balance', '15%'],
              ['Executive approval', '15%'],
              ['Low accountability', '10%'],
              ['Customer survival', '5%'],
              ['Operational survival', '5%'],
              ['Profit', '0%'],
            ].map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </>
      )}
      {view === 'Reports' && (
        <>
          <div className="report-hero">
            <span>Annualised turnover</span>
            <strong>{millions(game.metrics.turnover)}</strong>
            <small>Cash reserve {money(game.company.cash)}</small>
          </div>
          <TrendChart history={game.history} />
          <h2>Weekly financial statement</h2>
          <dl className="ledger">
            {Object.entries(game.financials).map(([label, value]) => (
              <div key={label}>
                <dt className="capitalize">{label}</dt>
                <dd>{money(value)}</dd>
              </div>
            ))}
          </dl>
          <h2>Department performance</h2>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Team</th>
                  <th>Load</th>
                  <th>Performance</th>
                </tr>
              </thead>
              <tbody>
                {game.departments.map((d) => (
                  <tr key={d.id}>
                    <th>{d.name}</th>
                    <td>{number(loadRatio(d) * 100)}%</td>
                    <td>{number(d.performance)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
