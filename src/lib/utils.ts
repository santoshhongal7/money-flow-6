import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: Date): string {
  return format(date, 'dd MMM yyyy');
}

export function formatMonth(month: string): string {
  const [year, m] = month.split('-').map(Number);
  return format(new Date(year, m - 1, 1), 'MMM yyyy');
}

export function getCurrentMonth(): string {
  return format(new Date(), 'yyyy-MM');
}

/**
 * PDF-safe currency formatter — uses "Rs." instead of ₹ because jsPDF's
 * built-in Helvetica font does not contain the Rupee symbol (U+20B9).
 */
export function formatINRforPDF(amount: number): string {
  return 'Rs. ' + new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Remove undefined fields so Firestore doesn't throw "Unsupported field value: undefined" */
export function stripUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as Partial<T>;
}

export function humanizeFirebaseError(code: string): string {
  const map: Record<string, string> = {
    'auth/invalid-email': 'Invalid email address.',
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/email-already-in-use': 'Email already registered.',
    'auth/weak-password': 'Password is too weak (min 6 characters).',
    'auth/too-many-requests': 'Too many attempts. Try again later.',
    'auth/network-request-failed': 'Network error. Check your connection.',
    'auth/popup-closed-by-user': 'Sign-in popup was closed.',
    'auth/invalid-credential': 'Invalid credentials. Please try again.',
  };
  return map[code] || 'An error occurred. Please try again.';
}
