import {
  collection, doc, getDocs, addDoc, updateDoc,
  query, orderBy, where, Timestamp, serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { stripUndefined } from '../utils';
import type { InterestRecord } from '../../types';

function toDate(val: unknown): Date {
  if (val instanceof Timestamp) return val.toDate();
  if (val instanceof Date) return val;
  return new Date();
}

function docToRecord(id: string, data: Record<string, unknown>): InterestRecord {
  return {
    id,
    userId: data.userId as string,
    transactionId: data.transactionId as string,
    personId: data.personId as string,
    type: data.type as 'borrow' | 'lend',
    month: data.month as string,
    principalAtMonth: data.principalAtMonth as number,
    interestAmount: data.interestAmount as number,
    isProRated: data.isProRated as boolean,
    isPaid: data.isPaid as boolean,
    paidDate: data.paidDate ? toDate(data.paidDate) : undefined,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

export async function getInterestRecords(userId: string): Promise<InterestRecord[]> {
  const q = query(
    collection(db, 'users', userId, 'interestRecords'),
    orderBy('month', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => docToRecord(d.id, d.data() as Record<string, unknown>));
}

export async function getInterestRecordsByTransaction(
  userId: string,
  transactionId: string
): Promise<InterestRecord[]> {
  const q = query(
    collection(db, 'users', userId, 'interestRecords'),
    where('transactionId', '==', transactionId),
    orderBy('month', 'asc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => docToRecord(d.id, d.data() as Record<string, unknown>));
}

export async function createInterestRecord(
  userId: string,
  data: Omit<InterestRecord, 'id'>
): Promise<InterestRecord> {
  const payload: Record<string, unknown> = {
    ...stripUndefined(data as Record<string, unknown>),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (data.paidDate) payload.paidDate = Timestamp.fromDate(data.paidDate);
  const ref = await addDoc(collection(db, 'users', userId, 'interestRecords'), payload);
  return { id: ref.id, ...data };
}

export async function updateInterestRecord(
  userId: string,
  recordId: string,
  data: Partial<Omit<InterestRecord, 'id' | 'userId' | 'createdAt'>>
): Promise<void> {
  const payload: Record<string, unknown> = { ...stripUndefined(data as Record<string, unknown>), updatedAt: serverTimestamp() };
  if (data.paidDate) payload.paidDate = Timestamp.fromDate(data.paidDate);
  await updateDoc(doc(db, 'users', userId, 'interestRecords', recordId), payload);
}
