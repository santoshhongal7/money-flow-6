import { useEffect } from 'react';
import { useTransactionsStore } from '../stores/transactionsStore';
import { useAuthStore } from '../stores/authStore';
import {
  getTransactions, createTransaction, updateTransaction, deleteTransaction
} from '../lib/firestore/transactions';
import {
  getRepayments, createRepayment
} from '../lib/firestore/repayments';
import type { Transaction, Repayment } from '../types';
import { toast } from 'sonner';

export function useTransactions() {
  const { user } = useAuthStore();
  const store = useTransactionsStore();

  useEffect(() => {
    if (!user) return;
    store.setLoading(true);
    Promise.all([getTransactions(user.uid), getRepayments(user.uid)])
      .then(([txs, reps]) => {
        store.setTransactions(txs);
        store.setRepayments(reps);
      })
      .catch((e) => store.setError(e.message))
      .finally(() => store.setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  async function addTransaction(
    data: Omit<Transaction, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ) {
    if (!user) return;
    const tx = await createTransaction(user.uid, data);
    store.addTransaction(tx);
    return tx;
  }

  async function editTransaction(
    transactionId: string,
    data: Partial<Omit<Transaction, 'id' | 'userId' | 'createdAt'>>
  ) {
    if (!user) return;
    await updateTransaction(user.uid, transactionId, data);
    const existing = store.transactions.find(t => t.id === transactionId);
    if (existing) store.updateTransaction({ ...existing, ...data, updatedAt: new Date() });
  }

  async function removeTransaction(transactionId: string) {
    if (!user) return;
    await deleteTransaction(user.uid, transactionId);
    store.removeTransaction(transactionId);
  }

  async function addRepayment(
    data: Omit<Repayment, 'id' | 'userId' | 'createdAt'>
  ) {
    if (!user) return;
    try {
      const rep = await createRepayment(user.uid, data);
      store.addRepayment(rep);
      // Update currentPrincipal on transaction
      const tx = store.transactions.find(t => t.id === data.transactionId);
      if (tx) {
        const txRepayments = [...store.repayments, rep].filter(r => r.transactionId === tx.id);
        const totalRepaid = txRepayments.reduce((s, r) => s + r.amount, 0);
        const newPrincipal = Math.max(0, tx.originalAmount - totalRepaid);
        await updateTransaction(user.uid, tx.id, { currentPrincipal: newPrincipal });
        store.updateTransaction({ ...tx, currentPrincipal: newPrincipal, updatedAt: new Date() });
      }
      return rep;
    } catch (e: unknown) {
      toast.error('Failed to add repayment');
      throw e;
    }
  }

  return {
    transactions: store.transactions,
    repayments: store.repayments,
    isLoading: store.isLoading,
    addTransaction,
    editTransaction,
    removeTransaction,
    addRepayment,
  };
}
