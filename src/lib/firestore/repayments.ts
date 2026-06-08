import {
  collection, doc, getDocs, addDoc, deleteDoc,
  query, orderBy, where, Timestamp, serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { stripUndefined } from '../utils';
import type { Repayment } from '../../types';

function toDate(val: unknown): Date {
  if (val instanceof Timestamp) return val.toDate();
  if (val instanceof Date) return val;
  return new Date();
}

function docToRepayment(id: string, data: Record<string, unknown>): Repayment {
  return {
    id,
    userId: data.userId as string,
    transactionId: data.transactionId as string,
    personId: data.personId as string,
    amount: data.amount as number,
    date: toDate(data.date),
    notes: data.notes as string | undefined,
    createdAt: toDate(data.createdAt),
  };
}

export async function getRepayments(userId: string): Promise<Repayment[]> {
  const q = query(
    collection(db, 'users', userId, 'repayments'),
    orderBy('date', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => docToRepayment(d.id, d.data() as Record<string, unknown>));
}

export async function getRepaymentsByTransaction(
  userId: string,
  transactionId: string
): Promise<Repayment[]> {
  const q = query(
    collection(db, 'users', userId, 'repayments'),
    where('transactionId', '==', transactionId),
    orderBy('date', 'asc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => docToRepayment(d.id, d.data() as Record<string, unknown>));
}

export async function createRepayment(
  userId: string,
  data: Omit<Repayment, 'id' | 'userId' | 'createdAt'>
): Promise<Repayment> {
  const payload = {
    ...stripUndefined(data as Record<string, unknown>),
    userId,
    date: Timestamp.fromDate(data.date),
    createdAt: serverTimestamp(),
  };
  const ref = await addDoc(collection(db, 'users', userId, 'repayments'), payload);
  return {
    id: ref.id,
    userId,
    ...data,
    createdAt: new Date(),
  };
}

export async function deleteRepayment(userId: string, repaymentId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', userId, 'repayments', repaymentId));
}
