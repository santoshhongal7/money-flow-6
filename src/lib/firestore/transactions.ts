import {
  collection, doc, getDocs, addDoc, updateDoc, deleteDoc,
  query, orderBy, Timestamp, serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { stripUndefined } from '../utils';
import type { Transaction } from '../../types';

function toDate(val: unknown): Date {
  if (val instanceof Timestamp) return val.toDate();
  if (val instanceof Date) return val;
  return new Date();
}

function docToTransaction(id: string, data: Record<string, unknown>): Transaction {
  return {
    id,
    userId: data.userId as string,
    personId: data.personId as string,
    type: data.type as 'borrow' | 'lend',
    originalAmount: data.originalAmount as number,
    currentPrincipal: data.currentPrincipal as number,
    interestRate: data.interestRate as number,
    startDate: toDate(data.startDate),
    status: data.status as 'active' | 'settled',
    settledDate: data.settledDate ? toDate(data.settledDate) : undefined,
    settledAmount: data.settledAmount as number | undefined,
    notes: data.notes as string | undefined,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

export async function getTransactions(userId: string): Promise<Transaction[]> {
  const q = query(
    collection(db, 'users', userId, 'transactions'),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => docToTransaction(d.id, d.data() as Record<string, unknown>));
}

export async function createTransaction(
  userId: string,
  data: Omit<Transaction, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
): Promise<Transaction> {
  const payload = {
    ...stripUndefined(data as Record<string, unknown>),
    userId,
    startDate: Timestamp.fromDate(data.startDate),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const ref = await addDoc(collection(db, 'users', userId, 'transactions'), payload);
  return {
    id: ref.id,
    userId,
    ...data,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export async function updateTransaction(
  userId: string,
  transactionId: string,
  data: Partial<Omit<Transaction, 'id' | 'userId' | 'createdAt'>>
): Promise<void> {
  const payload: Record<string, unknown> = { ...stripUndefined(data as Record<string, unknown>), updatedAt: serverTimestamp() };
  if (data.settledDate) payload.settledDate = Timestamp.fromDate(data.settledDate);
  if (data.startDate) payload.startDate = Timestamp.fromDate(data.startDate);
  await updateDoc(doc(db, 'users', userId, 'transactions', transactionId), payload);
}

export async function deleteTransaction(userId: string, transactionId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', userId, 'transactions', transactionId));
}
