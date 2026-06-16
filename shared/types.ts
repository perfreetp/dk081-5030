export type EmployeeType = 'resignation' | 'transfer' | 'assignment';

export type EmployeeStatus = 'pending' | 'validated' | 'in_progress' | 'completed' | 'returned' | 'resubmitted';

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'paused';

export type ValidationStatus = 'pass' | 'fail' | 'warning';

export type ValidationItemKey = 'name' | 'idCard' | 'currentCity' | 'targetCity' | 'stopDate' | 'hasBenefits' | 'hasDuplicate' | 'missingCertificate';

export type DocumentType = 'stamp_list' | 'confirmation' | 'correction';

export interface Employee {
  id: string;
  name: string;
  idCard: string;
  phone?: string;
  employeeType: EmployeeType;
  currentCity: string;
  targetCity: string;
  stopDate: string;
  hasBenefits: boolean;
  hasDuplicate: boolean;
  missingCertificate: boolean;
  status: EmployeeStatus;
  returnCount: number;
  taskId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  validationResult?: ValidationResult;
  returnReasons?: ReturnReason[];
}

export interface ValidationResult {
  id: string;
  employeeId: string;
  overallPass: boolean;
  items: ValidationItem[];
  validatedAt: string;
}

export interface ValidationItem {
  key: ValidationItemKey;
  name: string;
  pass: boolean;
  message?: string;
}

export interface ReturnReason {
  id: string;
  employeeId: string;
  reason: string;
  category: string;
  markedBy: string;
  markedAt: string;
}

export interface Task {
  id: string;
  city: string;
  employeeCount: number;
  employeeIds: string[];
  deadline?: string;
  status: TaskStatus;
  progress: number;
  materials: MaterialItem[];
  timeline: TimelineItem[];
  collaborationRecords: CollaborationRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface MaterialItem {
  name: string;
  optional: boolean;
  collected: boolean;
  description: string;
}

export interface TimelineItem {
  name: string;
  dueDate: string;
  description: string;
  completed: boolean;
}

export interface CollaborationRecord {
  id: string;
  taskId: string;
  type: 'note' | 'supplement' | 'communication';
  content: string;
  createdBy: string;
  createdAt: string;
}

export interface SuccessRateData {
  city: string;
  successCount: number;
  failCount: number;
  rate: number;
}

export interface AverageTimeData {
  city: string;
  days: number;
}

export interface RejectionReasonData {
  reason: string;
  count: number;
}

export interface DashboardStats {
  totalEmployees: number;
  pendingValidation: number;
  inProgress: number;
  completed: number;
  returned: number;
  successRate: number;
  validationIssues: number;
  averageTime: number;
  byCity: { city: string; count: number }[];
  byType: { resignation: number; transfer: number; assignment: number };
}

export interface TodoItem {
  id: string;
  icon: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  dueDate: string;
  link: string;
}

export interface User {
  id: string;
  username: string;
  name: string;
  role: 'admin' | 'hr';
  password?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface EmployeeFilterParams {
  status?: EmployeeStatus;
  employeeType?: EmployeeType;
  currentCity?: string;
  targetCity?: string;
  keyword?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
