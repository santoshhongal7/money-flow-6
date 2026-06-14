import { create } from 'zustand';
import type { Transaction, Repayment } from '../types';

interface TransactionsState {
  transactions: Transaction[];
  repayments: Repayment[];
  isLoading: boolean;
  error: string | null;
  setTransactions: (tx: Transaction[]) => void;
  addTransaction: (tx: Transaction) => void;
  updateTransaction: (tx: Transaction) => void;
  removeTransaction: (id: string) => void;
  removeByPersonId: (personId: string) => void;
  setRepayments: (r: Repayment[]) => void;
  addRepayment: (r: Repayment) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useTransactionsStore = create<TransactionsState>((set) => ({
  transactions: [],
  repayments: [],
  isLoading: false,
  error: null,
  setTransactions: (transactions) => set({ transactions }),
  addTransaction: (tx) => set((s) => ({ transactions: [tx, ...s.transactions] })),
  updateTransaction: (tx) =>
    set((s) => ({ transactions: s.transactions.map((t) => (t.id === tx.id ? tx : t)) })),
  removeTransaction: (id) =>
    set((s) => ({ transactions: s.transactions.filter((t) => t.id !== id) })),
  removeByPersonId: (personId) =>
    set((s) => ({
      transactions: s.transactions.filter((t) => t.personId !== personId),
      repayments: s.repayments.filter((r) => r.personId !== personId),
    })),
  setRepayments: (repayments) => set({ repayments }),
  addRepayment: (r) => set((s) => ({ repayments: [r, ...s.repayments] })),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));
