import {
  collection, doc, getDocs, addDoc, updateDoc, deleteDoc,
  query, orderBy, Timestamp, serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { stripUndefined } from '../utils';
import type { Person } from '../../types';

function toDate(val: unknown): Date {
  if (val instanceof Timestamp) return val.toDate();
  if (val instanceof Date) return val;
  return new Date();
}

function docToPerson(id: string, data: Record<string, unknown>): Person {
  return {
    id,
    userId: data.userId as string,
    name: data.name as string,
    phone: data.phone as string | undefined,
    email: data.email as string | undefined,
    notes: data.notes as string | undefined,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

export async function getPersons(userId: string): Promise<Person[]> {
  const q = query(
    collection(db, 'users', userId, 'persons'),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => docToPerson(d.id, d.data() as Record<string, unknown>));
}

export async function createPerson(
  userId: string,
  data: Omit<Person, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
): Promise<Person> {
  const payload = {
    ...stripUndefined(data as Record<string, unknown>),
    userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const ref = await addDoc(collection(db, 'users', userId, 'persons'), payload);
  return {
    id: ref.id,
    userId,
    ...data,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export async function updatePerson(
  userId: string,
  personId: string,
  data: Partial<Omit<Person, 'id' | 'userId' | 'createdAt'>>
): Promise<void> {
  const payload = {
    ...stripUndefined(data as Record<string, unknown>),
    updatedAt: serverTimestamp(),
  };
  await updateDoc(doc(db, 'users', userId, 'persons', personId), payload);
}

export async function deletePerson(userId: string, personId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', userId, 'persons', personId));
}
