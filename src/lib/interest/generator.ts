import { format, startOfMonth } from 'date-fns';
import type { Transaction, Repayment, InterestRecord } from '../../types';
import { calculateMonthInterest, getMonthsToGenerate, getPrincipalAtMonth } from './calculator';
import { createInterestRecord, updateInterestRecord } from '../firestore/interestRecords';

export async function generateMissingInterestRecords(
  userId: string,
  transaction: Transaction,
  repayments: Repayment[],
  existingRecords: InterestRecord[]
): Promise<InterestRecord[]> {
  const today = new Date();
  const currentMonth = format(startOfMonth(today), 'yyyy-MM');

  // Build a map: month → existing record (for this transaction)
  const existingByMonth = new Map<string, InterestRecord>(
    existingRecords.map(r => [r.month, r])
  );

  const endDate =
    transaction.status === 'settled' && transaction.settledDate
      ? transaction.settledDate
      : today;

  const monthsToProcess = getMonthsToGenerate(transaction.startDate, endDate);
  const newOrUpdatedRecords: InterestRecord[] = [];

  for (const month of monthsToProcess) {
    const isCurrentMonth = month === currentMonth;
    const existing = existingByMonth.get(month);

    // Skip past months that already have a record — they won't change
    if (existing && !isCurrentMonth) continue;

    const [y, m] = month.split('-').map(Number);
    const monthStart = startOfMonth(new Date(y, m - 1, 1));
    const principal = getPrincipalAtMonth(
      transaction.originalAmount,
      repayments,
      monthStart
    );

    if (principal <= 0) continue;

    const { amount, isProRated } = calculateMonthInterest(
      principal,
      transaction.interestRate,
      month,
      transaction.startDate,
      today
    );

    if (existing && isCurrentMonth) {
      // Update the existing current-month record with today's pro-rated amount
      await updateInterestRecord(userId, existing.id, {
        principalAtMonth: principal,
        interestAmount: amount,
        isProRated,
        updatedAt: new Date(),
      });
      const updated: InterestRecord = {
        ...existing,
        principalAtMonth: principal,
        interestAmount: amount,
        isProRated,
        updatedAt: new Date(),
      };
      newOrUpdatedRecords.push(updated);
    } else {
      // Create new record
      const recordData: Omit<InterestRecord, 'id'> = {
        userId,
        transactionId: transaction.id,
        personId: transaction.personId,
        type: transaction.type,
        month,
        principalAtMonth: principal,
        interestAmount: amount,
        isProRated,
        isPaid: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const saved = await createInterestRecord(userId, recordData);
      newOrUpdatedRecords.push(saved);
    }
  }

  return newOrUpdatedRecords;
}
