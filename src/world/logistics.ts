import { z } from 'zod';
import type { LiveSession } from '../models/live';
import type { OfficeId } from '../models/game';
import { applyEffects } from '../game/effects';

const depot = z.object({
  units: z.number().int().nonnegative(),
  counted: z.number().int().nonnegative(),
  shipped: z.number().int().nonnegative(),
  lost: z.number().int().nonnegative(),
  activity: z.string(),
});
export const logisticsSchema = z.object({
  albion: depot,
  continental: depot,
  processed: z.array(z.string()),
});
export const createLogistics = (): z.infer<typeof logisticsSchema> => ({
  albion: {
    units: 180,
    counted: 0,
    shipped: 0,
    lost: 0,
    activity: 'Receiving pallets',
  },
  continental: {
    units: 240,
    counted: 0,
    shipped: 0,
    lost: 0,
    activity: 'Receiving pallets',
  },
  processed: [],
});
export function depotRequests(s: LiveSession, office: OfficeId) {
  return s.requests
    .filter((r) => r.departmentId === 'logistics')
    .filter((_, i) => (i % 2 === 0 ? 'albion' : 'continental') === office);
}
export function tickLogistics(s: LiveSession) {
  if (!s.world) return;
  const stock = (s.world.logistics ??= createLogistics());
  for (const office of ['albion', 'continental'] as const) {
    const d = stock[office];
    const workers = s.game.employees.filter(
      (e) =>
        e.officeId === office &&
        e.departmentId === 'logistics' &&
        ['active', 'notice'].includes(e.status),
    );
    const requests = depotRequests(s, office);
    for (const request of requests.filter(
      (r) =>
        ['resolved', 'expired'].includes(r.status) &&
        !stock.processed.includes(r.id),
    )) {
      stock.processed.push(request.id);
      if (request.status === 'expired') {
        const lost = Math.min(d.units, 12);
        d.units -= lost;
        d.lost += lost;
        d.counted = Math.min(d.counted, d.units);
        d.activity = 'Missed approval: consignment lost, customer cancelled';
        applyEffects(s.game, [
          { type: 'TURNOVER', amount: -60000 },
          { type: 'ACCOUNTABILITY', amount: 2 },
        ]);
        if (
          s.game.metrics.turnover <= 0 ||
          s.game.metrics.accountability >= 100
        ) {
          s.game.status = 'finished';
          s.paused = true;
          return;
        }
      } else {
        d.activity = 'Shipment decision received; recounting before release';
        d.counted = 0;
      }
    }
    if (s.elapsed % 20 !== 0) continue;
    if (!workers.length) {
      d.activity = 'No stock team available: dispatch stopped';
      continue;
    }
    if (s.elapsed % 120 === 0) {
      d.units += 36;
      d.activity = 'Supplier delivery: 36 units received';
    }
    const count = Math.min(d.units - d.counted, workers.length * 8);
    d.counted += count;
    const held = requests.some((r) =>
      ['pending', 'delegated'].includes(r.status),
    );
    if (held) {
      d.activity = 'Counting stock; shipment held for logistics approval';
      continue;
    }
    if (s.elapsed % 60 === 0 && d.counted > 0) {
      const shipment = Math.min(d.counted, workers.length * 6);
      d.units -= shipment;
      d.counted -= shipment;
      d.shipped += shipment;
      d.activity = `${shipment} verified units dispatched`;
      applyEffects(s.game, [{ type: 'TURNOVER', amount: shipment * 1000 }]);
    } else
      d.activity = count
        ? `Stock count: ${count} units verified`
        : 'All stock counted; preparing dispatch';
  }
}
