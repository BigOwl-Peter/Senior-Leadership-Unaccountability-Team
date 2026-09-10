import type { GameEffect, GameState } from '../models/game';
import { clamp } from './systems';
// Mutable only within an engine-owned clone; public commands never modify their input.
export function applyEffects(state: GameState, effects: GameEffect[]) {
  for (const effect of effects) {
    switch (effect.type) {
      case 'TURNOVER':
        state.metrics.turnover = Math.max(
          0,
          state.metrics.turnover + effect.amount,
        );
        break;
      case 'COST':
        state.company.pendingCosts += effect.amount;
        state.company.totalDecisionCosts += effect.amount;
        break;
      case 'ACCOUNTABILITY':
        state.metrics.accountability = clamp(
          state.metrics.accountability + effect.amount,
        );
        break;
      case 'EXECUTIVE_APPROVAL':
        state.metrics.executiveApproval = clamp(
          state.metrics.executiveApproval + effect.amount,
        );
        break;
      case 'CUSTOMER_SATISFACTION':
        state.metrics.customerSatisfaction = clamp(
          state.metrics.customerSatisfaction + effect.amount,
        );
        break;
      case 'COMPLIANCE_RISK':
        state.metrics.complianceRisk = clamp(
          state.metrics.complianceRisk + effect.amount,
        );
        break;
      case 'MORALE':
        for (const employee of state.employees)
          if (employee.status === 'active' || employee.status === 'notice')
            employee.morale = clamp(employee.morale + effect.amount);
        state.metrics.morale = clamp(state.metrics.morale + effect.amount);
        break;
      case 'WORKLOAD': {
        const department = state.departments.find(
          (d) => d.id === effect.departmentId,
        );
        if (!department)
          throw new Error(`Unknown department: ${effect.departmentId}`);
        department.workload = Math.max(0, department.workload + effect.amount);
        break;
      }
    }
  }
}
