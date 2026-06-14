import { useEffect } from 'react';
import { useInterestStore } from '../stores/interestStore';
import { useAuthStore } from '../stores/authStore';
import { useTransactionsStore } from '../stores/transactionsStore';
import { usePersonsStore } from '../stores/personsStore';
import { getInterestRecords, updateInterestRecord } from '../lib/firestore/interestRecords';
import { generateMissingInterestRecords } from '../lib/interest/generator';
import { toast } from 'sonner';

export function useInterestRecords() {
  const { user } = useAuthStore();
  const store = useInterestStore();
  const { transactions, repayments } = useTransactionsStore();
  const { persons } = usePersonsStore();

  useEffect(() => {
    if (!user) return;
    store.setLoading(true);
    getInterestRecords(user.uid)
      .then(records => {
        const activeIds = new Set(persons.map(p => p.id));
        store.setRecords(activeIds.size > 0 ? records.filter(r => activeIds.has(r.personId)) : records);
      })
      .catch(() => {})
      .finally(() => store.setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  async function generateForAll() {
    if (!user) return;
    // Guard against concurrent calls (e.g. auto-trigger racing with button press)
    if (useInterestStore.getState().isGenerating) return;

    store.setGenerating(true);
    try {
      // Always fetch fresh records from Firestore — the in-memory store may be
      // stale if the initial DataLoader fetch hasn't finished yet, which causes
      // the generator to think no record exists and create a duplicate.
      const freshRecords = await getInterestRecords(user.uid);
      store.setRecords(freshRecords);

      const activeTransactions = transactions.filter(t => t.status === 'active');
      for (const tx of activeTransactions) {
        const txRepayments = repayments.filter(r => r.transactionId === tx.id);
        const existingRecords = freshRecords.filter(r => r.transactionId === tx.id);
        const newOrUpdated = await generateMissingInterestRecords(
          user.uid,
          tx,
          txRepayments,
          existingRecords
        );
        if (newOrUpdated.length > 0) store.upsertRecords(newOrUpdated);
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
