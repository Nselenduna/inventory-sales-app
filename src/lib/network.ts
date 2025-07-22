'use client';

import { useEffect, useState } from 'react';

// Network status singleton
export const networkStatus = {
  isOnline: typeof window !== 'undefined' ? navigator.onLine : true,
  listeners: new Set<(isOnline: boolean) => void>(),

  setOnline(status: boolean) {
    this.isOnline = status;
    this.listeners.forEach(listener => listener(status));
  },

  addListener(listener: (isOnline: boolean) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
};

// Event listeners for online/offline status
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => networkStatus.setOnline(true));
  window.addEventListener('offline', () => networkStatus.setOnline(false));
}

// React hook for network status
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(networkStatus.isOnline);

  useEffect(() => {
    const unsubscribe = networkStatus.addListener(setIsOnline);
    return unsubscribe;
  }, []);

  return isOnline;
} 