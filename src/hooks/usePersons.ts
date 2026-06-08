import { useEffect } from 'react';
import { usePersonsStore } from '../stores/personsStore';
import { useAuthStore } from '../stores/authStore';
import {
  getPersons, createPerson, updatePerson, deletePerson
} from '../lib/firestore/persons';
import type { Person } from '../types';
import { toast } from 'sonner';

export function usePersons() {
  const { user } = useAuthStore();
  const store = usePersonsStore();

  useEffect(() => {
    if (!user) return;
    store.setLoading(true);
    getPersons(user.uid)
      .then(store.setPersons)
      .catch((e) => store.setError(e.message))
      .finally(() => store.setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  async function addPerson(data: Omit<Person, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) {
    if (!user) return;
    try {
      const person = await createPerson(user.uid, data);
      store.addPerson(person);
      return person;
    } catch (e: unknown) {
      toast.error('Failed to add person');
      throw e;
    }
  }

  async function editPerson(personId: string, data: Partial<Omit<Person, 'id' | 'userId' | 'createdAt'>>) {
    if (!user) return;
    try {
      await updatePerson(user.uid, personId, data);
      const existing = store.persons.find(p => p.id === personId);
      if (existing) store.updatePerson({ ...existing, ...data, updatedAt: new Date() });
    } catch (e: unknown) {
      toast.error('Failed to update person');
      throw e;
    }
  }

  async function removePerson(personId: string) {
    if (!user) return;
    try {
      await deletePerson(user.uid, personId);
      store.removePerson(personId);
    } catch (e: unknown) {
      toast.error('Failed to delete person');
      throw e;
    }
  }

  return {
    persons: store.persons,
    isLoading: store.isLoading,
    addPerson,
    editPerson,
    removePerson,
  };
}
