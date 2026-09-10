import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import type { MetricSnapshot } from '../models/game';
import { millions } from '../utils/format';
export function TrendChart({ history }: { history: MetricSnapshot[] }) {
  return (
    <div
      className="chart"
      role="img"
      aria-label={`Annualised turnover trend: ${history.map((p) => `week ${p.turn}, ${millions(p.turnover)}`).join('; ')}`}
    >
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <AreaChart
          data={history}
          margin={{ top: 15, right: 16, bottom: 0, left: 4 }}
        >
          <CartesianGrid
            vertical={false}
            stroke="#e5e9e6"
            strokeDasharray="3 3"
          />
          <XAxis
            dataKey="turn"
            type="number"
            domain={[0, 20]}
            ticks={[0, 4, 8, 12, 16, 20]}
            tickFormatter={(n) => `W${n}`}
            tickLine={false}
            axisLine={false}
            tick={{ fill: '#69746e', fontSize: 12 }}
          />
          <YAxis
            domain={['auto', 'auto']}
            tickFormatter={(n) => `${(n / 1000000).toFixed(1)}m`}
            tickLine={false}
            axisLine={false}
            width={48}
            tick={{ fill: '#69746e', fontSize: 12 }}
          />
          <Tooltip
            formatter={(v) => [millions(Number(v)), 'Turnover']}
            labelFormatter={(v) => `Week ${v}`}
          />
          <Area
            type="linear"
            dataKey="turnover"
            stroke="#237151"
            fill="#e1eee7"
            strokeWidth={2.5}
            dot={{ r: 3, fill: '#237151' }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
