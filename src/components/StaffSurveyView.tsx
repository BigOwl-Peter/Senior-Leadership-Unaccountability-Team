import { useState } from 'react';
import { ClipboardList, Send } from 'lucide-react';
import type { DepartmentId } from '../models/game';
import { useGameStore } from '../stores/gameStore';
import {
  engagementBand,
  engagedPercent,
  mean,
  surveyMethods,
  surveyPresentation,
  type SurveyMethod,
} from '../game/staffSurvey';
import { teamName, timeText } from '../game/live';
import { realSeconds } from '../game/sessionTiming';
import { money } from '../utils/format';

export function StaffSurveyView() {
  const { session, publishSurvey } = useGameStore();
  const [method, setMethod] = useState<SurveyMethod>('reframe');
  const [team, setTeam] = useState<DepartmentId | 'all'>('all');
  const [scope, setScope] = useState<'teams' | 'people'>('teams');
  const survey = session.staffSurvey;
  if (!survey)
    return (
      <section className="company-view">
        <h1>Staff Survey</h1>
        <p>HR has not released the results yet.</p>
      </section>
    );
  const selected = survey.method ?? method;
  const draft = surveyPresentation(survey, selected);
  const raw = survey.responses;
  const ranked = [...raw]
    .filter((r) => team === 'all' || r.departmentId === team)
    .sort(
      (a, b) => a.engagement - b.engagement || a.name.localeCompare(b.name),
    );
  const teamRows = session.game.departments
    .map((d) => ({ ...d, rows: raw.filter((r) => r.departmentId === d.id) }))
    .filter((d) => d.rows.length)
    .sort(
      (a, b) =>
        mean(a.rows, 'engagement') - mean(b.rows, 'engagement') ||
        a.name.localeCompare(b.name),
    );
  const unaffordable =
    draft.cost > 0 &&
    draft.cost > session.game.company.cash - session.game.company.pendingCosts;
  return (
    <section className="company-view staff-survey">
      <header className="company-heading">
        <span>PEOPLE ANALYTICS / LEADERSHIP EYES ONLY</span>
        <h1>
          <ClipboardList size={24} /> Staff Survey
        </h1>
        <p>HR supplied the answers. The board is awaiting the story.</p>
        <button
          className="survey-jump"
          onClick={() =>
            document
              .getElementById('survey-board-story')
              ?.scrollIntoView({ block: 'start' })
          }
        >
          <Send size={15} />{' '}
          {survey.method ? 'View board report' : 'Prepare board presentation'}
        </button>
        <strong>
          {survey.method
            ? 'Board report published'
            : `Sign-off due in ${timeText(realSeconds(session, survey.deadline - session.elapsed))}`}
        </strong>
      </header>
      <div className="survey-layout">
        <section aria-label="Original survey results">
          <h2>The original results</h2>
          <p>
            {raw.length} staff at collection, business week{' '}
            {Math.floor(survey.openedAt / 60) + 1}. Includes active staff,
            absences and notice periods. Leavers before collection are excluded.
          </p>
          <dl className="survey-metrics">
            <div>
              <dt>Engaged</dt>
              <dd>{raw.length ? `${engagedPercent(raw)}%` : 'No responses'}</dd>
            </div>
            <div>
              <dt>Mean morale</dt>
              <dd>{raw.length ? `${mean(raw, 'morale')}/100` : '--'}</dd>
            </div>
            <div>
              <dt>Mean stress</dt>
              <dd>{raw.length ? `${mean(raw, 'stress')}/100` : '--'}</dd>
            </div>
          </dl>
          <div className="survey-bands">
            {['Engaged', 'Not engaged', 'Actively disengaged'].map((band) => (
              <span key={band}>
                <b>
                  {
                    raw.filter((r) => engagementBand(r.engagement) === band)
                      .length
                  }
                </b>{' '}
                {band}
              </span>
            ))}
          </div>
          <div className="survey-filters">
            <div className="speed-control" aria-label="Survey breakdown">
              <button
                aria-pressed={scope === 'teams'}
                onClick={() => setScope('teams')}
              >
                Teams
              </button>
              <button
                aria-pressed={scope === 'people'}
                onClick={() => setScope('people')}
              >
                Individuals
              </button>
            </div>
            {scope === 'people' && (
              <label>
                Team{' '}
                <select
                  aria-label="Filter survey by team"
                  value={team}
                  onChange={(e) =>
                    setTeam(e.target.value as DepartmentId | 'all')
                  }
                >
                  <option value="all">All teams</option>
                  {session.game.departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          <div className="table-scroll">
            <table>
              <caption>
                Original snapshot, lowest engagement first. Higher stress is
                worse.
              </caption>
              <thead>
                <tr>
                  <th scope="col">Rank</th>
                  <th scope="col">
                    {scope === 'teams'
                      ? 'Team / responses'
                      : 'Employee / team / office'}
                  </th>
                  <th scope="col">Morale</th>
                  <th scope="col">Stress</th>
                  <th scope="col">Engagement</th>
                </tr>
              </thead>
              <tbody>
                {scope === 'teams'
                  ? teamRows.map((d, index) => (
                      <tr key={d.id}>
                        <td>{index + 1}</td>
                        <th scope="row">
                          {d.name}
                          <small>{d.rows.length} responses</small>
                        </th>
                        <td>{mean(d.rows, 'morale')}</td>
                        <td>{mean(d.rows, 'stress')}</td>
                        <td>
                          {mean(d.rows, 'engagement')}/100
                          <small>{engagedPercent(d.rows)}% engaged</small>
                        </td>
                      </tr>
                    ))
                  : ranked.map((r, index) => (
                      <tr key={r.employeeId}>
                        <td>{index + 1}</td>
                        <th scope="row">
                          {r.name}
                          <small>
                            {teamName(r.departmentId)} /{' '}
                            {r.officeId === 'albion' ? 'Albion' : 'Continental'}
                          </small>
                        </th>
                        <td>{r.morale}</td>
                        <td>{r.stress}</td>
                        <td>
                          {r.engagement}/100
                          <small>{engagementBand(r.engagement)}</small>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
          {!raw.length && (
            <p>
              No staff were eligible to respond. HR will record an empty survey,
              not an engagement success.
            </p>
          )}
          <details className="survey-methodology">
            <summary>Scoring and survey basis</summary>
            <p>
              Fictional game index: 60% morale + 40% inverse stress, rounded to
              a whole number. Engaged: 70–100; not engaged: 40–69; actively
              disengaged: 0–39. Team scores are the mean of individual scores,
              not external percentiles.
            </p>
            <p>
              Loosely inspired by{' '}
              <a
                href="https://www.gallup.com/394373/indicator-employee-engagement.aspx"
                target="_blank"
                rel="noreferrer"
              >
                Gallup’s engagement categories
              </a>
              . This is not Gallup’s Q12 instrument, scoring formula or a
              validated assessment. Named responses are fictional game data.
            </p>
          </details>
        </section>
        <section
          className="survey-presentation"
          id="survey-board-story"
          aria-label="Board presentation"
        >
          <h2>
            {survey.method ? 'The published story' : 'Prepare the board story'}
          </h2>
          {!survey.method && (
            <fieldset>
              <legend>Leadership presentation</legend>
              {surveyMethods.map((option) => (
                <label key={option.id} className="survey-option">
                  <input
                    type="radio"
                    name="survey-method"
                    value={option.id}
                    checked={method === option.id}
                    onChange={() => setMethod(option.id)}
                  />
                  <span>
                    <strong>{option.label}</strong>
                    <small>{option.description}</small>
                  </span>
                </label>
              ))}
            </fieldset>
          )}
          <div className="survey-draft" aria-label="Report preview">
            <span>
              {survey.method ? 'BOARD PACK / FINAL' : 'BOARD PACK / DRAFT'}
            </span>
            <h3>{draft.headline}</h3>
            <p>
              {draft.count} of {raw.length} responses included.{' '}
              {draft.uplift > 0
                ? `Headline uplift: +${draft.uplift} percentage points versus the original engagement rate.`
                : 'No uplift versus the original engagement rate.'}
            </p>
            <p>
              {selected === 'reframe'
                ? 'The middle group is counted as positive; the underlying engagement scores are unchanged.'
                : selected === 'selective'
                  ? 'Only the highest-scoring half is counted. The full sample remains in HR records.'
                  : selected === 'invest'
                    ? 'Recovery funding changes live staff conditions, not the historic survey. The follow-up measures what happened next.'
                    : 'All eligible responses are included without reclassification.'}
            </p>
          </div>
          {!survey.method && (
            <>
              <dl className="ledger">
                <div>
                  <dt>Funding</dt>
                  <dd>{money(draft.cost)}</dd>
                </div>
                <div>
                  <dt>Immediate board approval</dt>
                  <dd>
                    {draft.approval > 0 ? '+' : ''}
                    {draft.approval}
                  </dd>
                </div>
                <div>
                  <dt>Risk of being challenged</dt>
                  <dd>{draft.auditRisk}%</dd>
                </div>
              </dl>
              <p>
                {selected === 'invest'
                  ? 'Morale +8, stress -12, team trust +6 and workload -20 per team. Later pressures can erode these gains.'
                  : selected === 'unfiltered'
                    ? 'Morale +2 and team trust +2. No work removed or recovery funded.'
                    : 'Morale -5, team trust -6 and accountability -4. A successful challenge reverses the board benefit and adds accountability and compliance risk.'}
              </p>
              <button
                className="primary"
                disabled={unaffordable || session.game.status === 'finished'}
                onClick={() => publishSurvey(method)}
              >
                <Send size={16} /> Publish to board
              </button>
              {unaffordable && (
                <p role="status">
                  Not enough uncommitted cash for this programme.
                </p>
              )}
              <p>
                Without sign-off, HR releases the unfiltered report. Publication
                is final; the follow-up arrives three business weeks later.
              </p>
            </>
          )}
          {survey.automatic && (
            <p>
              Sign-off expired. HR released the unfiltered report automatically.
            </p>
          )}
          {survey.method && (
            <section className="survey-review" aria-label="Survey follow-up">
              <h3>Follow-up review</h3>
              <p>
                {survey.outcome ??
                  `Due in ${timeText(realSeconds(session, survey.reviewAt! - session.elapsed))}. HR retained the original responses.`}
              </p>
              {survey.followUp && (
                <p>
                  Current workforce: {survey.followUp.length} responses,{' '}
                  {engagedPercent(survey.followUp)}% engaged, morale{' '}
                  {mean(survey.followUp, 'morale')}/100, stress{' '}
                  {mean(survey.followUp, 'stress')}/100. Staffing changes affect
                  this comparison.
                </p>
              )}
            </section>
          )}
        </section>
      </div>
    </section>
  );
}
