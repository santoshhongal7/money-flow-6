import { useEffect } from 'react';
import { useInterestStore } from '../stores/interestStore';
import { useAuthStore } from '../stores/authStore';
import { useTransactionsStore } from '../stores/transactionsStore';
import { getInterestRecords, updateInterestRecord } from '../lib/firestore/interestRecords';
import { generateMissingInterestRecords } from '../lib/interest/generator';
import { toast } from 'sonner';

export function useInterestRecords() {
  const { user } = useAuthStore();
  const store = useInterestStore();
  const { transactions, repayments } = useTransactionsStore();

  useEffect(() => {
    if (!user) return;
    store.setLoading(true);
    getInterestRecords(user.uid)
      .then(store.setRecords)
      .catch(() => {})
      .finally(() => store.setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  async function generateForAll() {
    if (!user) return;
    store.setGenerating(true);
    try {
      const activeTransactions = transactions.filter(t => t.status === 'active');
      for (const tx of activeTransactions) {
        const txRepayments = repayments.filter(r => r.transactionId === tx.id);
        const existingRecords = store.records.filter(r => r.transactionId === tx.id);
        const newRecords = await generateMissingInterestRecords(
          user.uid,
          tx,
          txRepayments,
          existingRecords
        );
        if (newRecords.length > 0) store.upsertRecords(newRecords);
      }
    } catch (e) {
      console.error('Error generating interest records', e);
    } finally {
      store.setGenerating(false);
    }
  }

  async function togglePaid(recordId: string, isPaid: boolean) {
    if (!user) return;
    const paidDate = isPaid ? new Date() : undefined;
    try {
      await updateInterestRecord(user.uid, recordId, { isPaid, paidDate });
      if (isPaid) {
        store.markPaid(recordId, paidDate!);
      } else {
        store.markUnpaid(recordId);
      }
    } catch (e) {
      toast.error('Failed to update interest record');
      throw e;
    }
  }

  return {
    records: store.records,
    isLoading: store.isLoading,
    isGenerating: store.isGenerating,
    generateForAll,
    togglePaid,
  };
}
