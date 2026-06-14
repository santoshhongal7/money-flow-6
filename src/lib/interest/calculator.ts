import {
  getDaysInMonth,
  startOfMonth,
  addMonths,
  format,
} from 'date-fns';

export function calculateMonthInterest(
  principal: number,
  rate: number,
  targetMonth: string,
  startDate: Date,
  today: Date = new Date(),
  clearingDate?: Date
): { amount: number; isProRated: boolean } {
  const [year, month] = targetMonth.split('-').map(Number);
  const targetMonthStart = new Date(year, month - 1, 1);
  const startMonth = format(startOfMonth(startDate), 'yyyy-MM');

  const fullMonthlyInterest = (principal * rate) / 100;
  const totalDays = getDaysInMonth(targetMonthStart);

  // Pro-rate the transaction's start month (didn't start from day 1)
  if (targetMonth === startMonth) {
    const startDay = startDate.getDate();
    const remainingDays = totalDays - startDay + 1;
    const amount = parseFloat(
      ((fullMonthlyInterest * remainingDays) / totalDays).toFixed(2)
    );
    return { amount, isProRated: startDay !== 1 };
  }

  // For account clearing/settlement: pro-rate the clearing month up to the clearing date
  if (clearingDate) {
    const clearingMonth = format(startOfMonth(clearingDate), 'yyyy-MM');
    if (targetMonth === clearingMonth) {
      const elapsedDays = clearingDate.getDate();
      const amount = parseFloat(
        ((fullMonthlyInterest * elapsedDays) / totalDays).toFixed(2)
      );
      return { amount, isProRated: true };
    }
  }

  // Current month and all past completed months — full interest (current month due at month end)
  return { amount: parseFloat(fullMonthlyInterest.toFixed(2)), isProRated: false };
}

export function getMonthsToGenerate(startDate: Date, endDate: Date = new Date()): string[] {
  const months: string[] = [];
  let cursor = startOfMonth(startDate);
  const end = startOfMonth(endDate);

  while (cursor <= end) {
    months.push(format(cursor, 'yyyy-MM'));
    cursor = addMonths(cursor, 1);
  }
  return months;
}

export function getPrincipalAtMonth(
  originalAmount: number,
  repayments: { amount: number; date: Date }[],
  monthStart: Date
): number {
  const appliedRepayments = repayments.filter(r => r.date < monthStart);
  const totalRepaid = appliedRepayments.reduce((sum, r) => sum + r.amount, 0);
  return Math.max(0, originalAmount - totalRepaid);
}
