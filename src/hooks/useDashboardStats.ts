import { useMemo } from 'react';
import { useTransactionsStore } from '../stores/transactionsStore';
import { useInterestStore } from '../stores/interestStore';
import { format, subMonths, startOfMonth } from 'date-fns';
import type { DashboardStats } from '../types';

export function useDashboardStats(): DashboardStats {
  const { transactions } = useTransactionsStore();
  const { records } = useInterestStore();

  return useMemo(() => {
    const now = new Date();
    const currentMonth = format(now, 'yyyy-MM');

    const active = transactions.filter(t => t.status === 'active');

    const totalBorrowed = active
      .filter(t => t.type === 'borrow')
      .reduce((s, t) => s + t.currentPrincipal, 0);

    const totalLent = active
      .filter(t => t.type === 'lend')
      .reduce((s, t) => s + t.currentPrincipal, 0);

    const currentMonthRecords = records.filter(r => r.month === currentMonth);

    const monthlyInterestOut = currentMonthRecords
      .filter(r => r.type === 'borrow')
      .reduce((s, r) => s + r.interestAmount, 0);

    const monthlyInterestIn = currentMonthRecords
      .filter(r => r.type === 'lend')
      .reduce((s, r) => s + r.interestAmount, 0);

    const overdueCount = records.filter(r => !r.isPaid && r.month < currentMonth).length;

    // Build 6-month trend
    const trendData = Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(startOfMonth(now), 5 - i);
      const m = format(d, 'yyyy-MM');
      const label = format(d, 'MMM yy');
      const monthRecs = records.filter(r => r.month === m);
      return {
        month: label,
        interestOut: monthRecs.filter(r => r.type === 'borrow').reduce((s, r) => s + r.interestAmount, 0),
        interestIn: monthRecs.filter(r => r.type === 'lend').reduce((s, r) => s + r.interestAmount, 0),
      };
    });

    return {
      totalBorrowed,
      totalLent,
      monthlyInterestOut,
      monthlyInterestIn,
      overdueCount,
      trendData,
    };
  }, [transactions, records]);
}
