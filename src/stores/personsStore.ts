import { create } from 'zustand';
import type { Person } from '../types';

interface PersonsState {
  persons: Person[];
  isLoading: boolean;
  error: string | null;
  setPersons: (persons: Person[]) => void;
  addPerson: (person: Person) => void;
  updatePerson: (person: Person) => void;
  removePerson: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const usePersonsStore = create<PersonsState>((set) => ({
  persons: [],
  isLoading: false,
  error: null,
  setPersons: (persons) => set({ persons }),
  addPerson: (person) => set((s) => ({ persons: [person, ...s.persons] })),
  updatePerson: (person) =>
    set((s) => ({ persons: s.persons.map((p) => (p.id === person.id ? person : p)) })),
  removePerson: (id) => set((s) => ({ persons: s.persons.filter((p) => p.id !== id) })),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));
