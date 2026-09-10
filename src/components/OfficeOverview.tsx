import { officeSummaries } from '../game/officeSummary';
import { useGameStore } from '../stores/gameStore';
import { millions } from '../utils/format';
import { Building2, UserPlus, UserMinus } from 'lucide-react';
export function OfficeOverview({ onOpen }: { onOpen: () => void }) {
  const game = useGameStore((s) => s.session.game);
  return (
    <section className="office-overview" aria-label="Office comparison">
      {officeSummaries(game).map((o) => (
        <button
          key={o.id}
          onClick={onOpen}
          className="office-overview-item"
          aria-label={`${o.name} office and workforce`}
        >
          <span className="office-overview-name">
            <Building2 size={16} />
            <strong>{o.name}</strong>
            <span>{o.headcount} people</span>
          </span>
          <span
            className="office-turnover"
            title="Allocated from group annualised turnover in proportion to current employee capacity. These are not independent office sales ledgers."
          >
            <strong>{millions(o.turnover)}</strong>{' '}
            <small>allocated turnover</small>
          </span>
          <span className="office-movement">
            <span>
              <UserPlus size={13} />
              {o.joining} joining / {o.joined} joined
            </span>
            <span>
              <UserMinus size={13} />
              {o.notice} on notice / {o.left} left
            </span>
          </span>
        </button>
      ))}
    </section>
  );
}
