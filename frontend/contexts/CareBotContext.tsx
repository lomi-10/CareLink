import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

type CareBotContextValue = {
  isOpen: boolean;
  /** Increments each time the panel is opened; use as a React key to reset chat. */
  sessionKey: number;
  open: () => void;
  close: () => void;
};

const CareBotContext = createContext<CareBotContextValue | null>(null);

export function CareBotProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [sessionKey, setSessionKey] = useState(0);

  const open = useCallback(() => {
    setSessionKey((k) => k + 1);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const value = useMemo(
    () => ({ isOpen, sessionKey, open, close }),
    [isOpen, sessionKey, open, close],
  );

  return <CareBotContext.Provider value={value}>{children}</CareBotContext.Provider>;
}

export function useCareBot(): CareBotContextValue {
  const ctx = useContext(CareBotContext);
  if (!ctx) {
    throw new Error('useCareBot must be used within CareBotProvider');
  }
  return ctx;
}

export function useCareBotOptional(): CareBotContextValue | null {
  return useContext(CareBotContext);
}
