export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: number;
  message: string;
  type: ToastType;
}

type ToastListener = (message: string, type: ToastType) => void;
const listeners = new Set<ToastListener>();

export const toast = {
  success: (message: string) => {
    listeners.forEach(l => l(message, 'success'));
  },
  error: (message: string) => {
    listeners.forEach(l => l(message, 'error'));
  },
  info: (message: string) => {
    listeners.forEach(l => l(message, 'info'));
  },
  subscribe: (listener: ToastListener) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }
};
