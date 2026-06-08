// ─── Enums ───────────────────────────────────────────────────────────────────

export type TransactionType = 'borrow' | 'lend';
export type TransactionStatus = 'active' | 'settled';

// ─── Firestore document shapes ───────────────────────────────────────────────

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  currency: 'INR';
  createdAt: Date;
  updatedAt: Date;
}

export interface Person {
  id: string;
  userId: string;
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Transaction {
  id: string;
  userId: string;
  personId: string;
  type: TransactionType;
  originalAmount: number;
  currentPrincipal: number;
  interestRate: number;
  startDate: Date;
  status: TransactionStatus;
  settledDate?: Date;
  settledAmount?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Repayment {
  id: string;
  userId: string;
  transactionId: string;
  personId: string;
  amount: number;
  date: Date;
  notes?: string;
  createdAt: Date;
}

export interface InterestRecord {
  id: string;
  userId: string;
  transactionId: string;
  personId: string;
  type: TransactionType;
  month: string; // 'YYYY-MM'
  principalAtMonth: number;
  interestAmount: number;
  isProRated: boolean;
  isPaid: boolean;
  paidDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Derived / UI shapes ─────────────────────────────────────────────────────

export interface PersonSummary {
  person: Person;
  totalBorrowed: number;
  totalLent: number;
  monthlyInterestOut: number;
  monthlyInterestIn: number;
  unpaidMonths: number;
}

export interface DashboardStats {
  totalBorrowed: number;
  totalLent: number;
  monthlyInterestOut: number;
  monthlyInterestIn: number;
  overdueCount: number;
  trendData: MonthlyTrend[];
}

export interface MonthlyTrend {
  month: string; // 'Jan 26'
  interestOut: number;
  interestIn: number;
}

export interface SettlementStatement {
  transaction: Transaction;
  person: Person;
  repayments: Repayment[];
  interestRecords: InterestRecord[];
  outstandingPrincipal: number;
  totalInterestAccrued: number;
  totalInterestPaid: number;
  totalInterestUnpaid: number;
  totalAmountToSettle: number;
  settlementDate: Date;
}
