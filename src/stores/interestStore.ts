import { create } from 'zustand';
import type { InterestRecord } from '../types';

interface InterestState {
  records: InterestRecord[];
  isLoading: boolean;
  isGenerating: boolean;
  setRecords: (records: InterestRecord[]) => void;
  addRecords: (records: InterestRecord[]) => void;
  /** Insert new records and replace any existing ones with the same id */
  upsertRecords: (records: InterestRecord[]) => void;
  markPaid: (id: string, paidDate: Date) => void;
  markUnpaid: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setGenerating: (generating: boolean) => void;
}

export const useInterestStore = create<InterestState>((set) => ({
  records: [],
  isLoading: false,
  isGenerating: false,
  setRecords: (records) => set({ records }),
  addRecords: (newRecords) =>
    set((s) => ({ records: [...s.records, ...newRecords] })),
  upsertRecords: (incoming) =>
    set((s) => {
      const incomingIds = new Set(incoming.map(r => r.id));
      const merged = s.records.filter(r => !incomingIds.has(r.id));
      return { records: [...merged, ...incoming] };
    }),
  markPaid: (id, paidDate) =>
    set((s) => ({
      records: s.records.map((r) =>
        r.id === id ? { ...r, isPaid: true, paidDate } : r
      ),
    })),
  markUnpaid: (id) =>
    set((s) => ({
      records: s.records.map((r) =>
        r.id === id ? { ...r, isPaid: false, paidDate: undefined } : r
      ),
    })),
  setLoading: (isLoading) => set({ isLoading }),
  setGenerating: (isGenerating) => set({ isGenerating }),
}));
