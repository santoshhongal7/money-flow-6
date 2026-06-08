import { create } from 'zustand';
import { format } from 'date-fns';

interface UIState {
  selectedMonth: string;
  activePersonId: string | null;
  activeTransactionId: string | null;
  commandOpen: boolean;
  darkMode: boolean;
  setSelectedMonth: (m: string) => void;
  setActivePersonId: (id: string | null) => void;
  setActiveTransactionId: (id: string | null) => void;
  setCommandOpen: (open: boolean) => void;
  toggleDarkMode: () => void;
  setDarkMode: (dark: boolean) => void;
}

const storedDark = localStorage.getItem('darkMode');
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
const initialDark = storedDark !== null ? storedDark === 'true' : prefersDark;

if (initialDark) document.documentElement.classList.add('dark');

export const useUIStore = create<UIState>((set) => ({
  selectedMonth: format(new Date(), 'yyyy-MM'),
  activePersonId: null,
  activeTransactionId: null,
  commandOpen: false,
  darkMode: initialDark,
  setSelectedMonth: (selectedMonth) => set({ selectedMonth }),
  setActivePersonId: (activePersonId) => set({ activePersonId }),
  setActiveTransactionId: (activeTransactionId) => set({ activeTransactionId }),
  setCommandOpen: (commandOpen) => set({ commandOpen }),
  toggleDarkMode: () =>
    set((s) => {
      const next = !s.darkMode;
      localStorage.setItem('darkMode', String(next));
      document.documentElement.classList.toggle('dark', next);
      return { darkMode: next };
    }),
  setDarkMode: (darkMode) => {
    localStorage.setItem('darkMode', String(darkMode));
    document.documentElement.classList.toggle('dark', darkMode);
    set({ darkMode });
  },
}));
