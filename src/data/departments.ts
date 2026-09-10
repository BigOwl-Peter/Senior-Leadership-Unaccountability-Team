import type { DepartmentId } from '../models/game';
export const departmentDefinitions: {
  id: DepartmentId;
  name: string;
  title: string;
}[] = [
  { id: 'sales', name: 'Sales', title: 'Sales Executive' },
  {
    id: 'service',
    name: 'Customer Service',
    title: 'Customer Service Adviser',
  },
  { id: 'logistics', name: 'Logistics', title: 'Logistics Coordinator' },
  { id: 'operations', name: 'Operations', title: 'Operations Specialist' },
  { id: 'product', name: 'Product', title: 'Product Analyst' },
  { id: 'finance', name: 'Finance', title: 'Finance Assistant' },
  { id: 'hr', name: 'HR', title: 'People Partner' },
  { id: 'it', name: 'IT', title: 'IT Support Analyst' },
  { id: 'compliance', name: 'Compliance', title: 'Compliance Officer' },
];
