export type DepartmentId =
  | 'sales'
  | 'service'
  | 'logistics'
  | 'operations'
  | 'product'
  | 'finance'
  | 'hr'
  | 'it'
  | 'compliance';
export type OfficeId = 'albion' | 'continental';
export interface Employee {
  id: string;
  firstName: string;
  surname: string;
  officeId: OfficeId;
  departmentId: DepartmentId;
  jobTitle: string;
  salary: number;
  competence: number;
  capacity: number;
  workload: number;
  morale: number;
  stress: number;
  politicalInfluence: number;
  customerSkill: number;
  complianceSkill: number;
  technicalSkill: number;
  salesSkill: number;
  loyalty: number;
  visibility: number;
  absenceRisk: number;
  resignationRisk: number;
  protectedStatus?: string[];
  promotionLevel?: number;
  returnTurn?: number;
  departureTurn?: number;
  history?: { turn: number; text: string }[];
  traits: string[];
  status: 'active' | 'absent' | 'notice' | 'redundant' | 'resigned';
}
export interface Department {
  id: DepartmentId;
  name: string;
  workload: number;
  capacity: number;
  performance: number;
  budget: number;
  managerId?: string;
  officePresence: Record<OfficeId, number>;
  baselineWorkload: number;
}
export interface Office {
  id: OfficeId;
  name: string;
  location: string;
}
export interface Product {
  id: string;
  name: string;
  demand: number;
  availability: number;
  quality: number;
  status: 'development' | 'launched' | 'withdrawn';
}
export interface GameMetrics {
  turnover: number;
  previousTurnover: number;
  profit: number;
  accountability: number;
  executiveApproval: number;
  customerSatisfaction: number;
  morale: number;
  complianceRisk: number;
  operationalHealth: number;
}
export type GameEffect =
  | {
      type:
        | 'TURNOVER'
        | 'ACCOUNTABILITY'
        | 'MORALE'
        | 'EXECUTIVE_APPROVAL'
        | 'CUSTOMER_SATISFACTION'
        | 'COMPLIANCE_RISK'
        | 'COST';
      amount: number;
    }
  | { type: 'WORKLOAD'; departmentId: DepartmentId; amount: number };
export interface DelayedEffect {
  dueTurn: number;
  title: string;
  effects: GameEffect[];
}
export interface EventChoice {
  id: string;
  label: string;
  description: string;
  immediateEffects: GameEffect[];
  delayedEffects?: { delay: number; title: string; effects: GameEffect[] }[];
  requirements?: {
    minCash?: number;
    departmentId?: DepartmentId;
    minStaff?: number;
  };
  followUps?: { eventId: string; delay: number; probability?: number }[];
}
export interface GameEvent {
  id: string;
  title: string;
  category: string;
  description: string;
  departmentId: DepartmentId;
  workload: number;
  choices: EventChoice[];
  followUpOnly?: boolean;
  requirements?: {
    minTurn?: number;
    minRisk?: number;
    maxMorale?: number;
    minLoad?: number;
    minNotice?: number;
  };
  weight?: number;
}
export interface ActiveEvent {
  eventId: string;
  turn: number;
  choiceId?: string;
}
export interface BoardObjective {
  id: string;
  label: string;
  metric: 'turnover' | 'accountability' | 'office';
  target: number;
  officeId?: OfficeId;
  officeRule?: 'difference' | 'ratio' | 'consolidate' | 'grow-shrink';
  departmentId?: DepartmentId;
  initialTargetHeadcount?: number;
  initialOtherHeadcount?: number;
}
export interface GameLogEntry {
  turn: number;
  type: 'decision' | 'resolution' | 'consequence' | 'personnel';
  title: string;
  description: string;
  effects?: GameEffect[];
}
export interface FinancialReport {
  revenue: number;
  payroll: number;
  shipping: number;
  operating: number;
  productCosts: number;
  decisions: number;
  profit: number;
}
export interface MetricSnapshot extends GameMetrics {
  turn: number;
}
export interface GameState {
  gameId: string;
  seed: string;
  turn: number;
  maxTurns: number;
  status: 'running' | 'finished';
  managementActionUsed: boolean;
  personnelActionsLeft: number;
  decisionTempo?: { total: number; count: number };
  candidates: Candidate[];
  recruitment: Recruitment[];
  company: {
    name: string;
    initialTurnover: number;
    cash: number;
    pendingCosts: number;
    totalDecisionCosts: number;
  };
  offices: Office[];
  departments: Department[];
  employees: Employee[];
  products: Product[];
  customers: {
    complaintBacklog: number;
    responseTime: number;
    escalatedCustomers: number;
    majorAccountsAtRisk: number;
  };
  logistics: {
    ordersPending: number;
    ordersShipped: number;
    lateOrders: number;
    lostShipments: number;
    customsHolds: number;
    freightCost: number;
  };
  boardObjectives: BoardObjective[];
  activeEvents: ActiveEvent[];
  delayedEffects: DelayedEffect[];
  eventHistory: GameLogEntry[];
  metrics: GameMetrics;
  history: MetricSnapshot[];
  financials: FinancialReport;
}
export interface Candidate {
  id: string;
  employee: Employee;
  role: 'junior' | 'specialist' | 'manager';
  competenceEstimate: [number, number];
  interview: string;
  leadTime: number;
}
export interface Recruitment {
  id: string;
  employee: Employee;
  dueTurn: number;
  status: 'pending' | 'joined' | 'cancelled';
}
export interface HighScore {
  seed: string;
  score: number;
  turnover: number;
  date: string;
}
export interface SaveData {
  schemaVersion: 1;
  gameVersion: string;
  currentGame: GameState;
  highScores: HighScore[];
  settings: { reducedMotion: boolean };
}
