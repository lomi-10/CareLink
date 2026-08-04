import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

type CareBotContextValue = {
  isOpen: boolean;
  /**
   * Increments only when the conversation should actually restart — on
   * logout, not on every open/close. Opening and closing the panel used to
   * wipe the transcript each time (it bumped what was then called
   * `sessionKey` on every `open()`), so the conversation never survived past
   * a single glance at the FAB. The chat panel itself stays mounted for the
   * whole app session (RN's <Modal> doesn't unmount hidden children), so as
   * long as nothing forces a reseed, the transcript already persists.
   */
  resetNonce: number;
  open: () => void;
  close: () => void;
  /** Call on logout so the next signed-in user starts a fresh conversation. */
  resetChat: () => void;
};

const CareBotContext = createContext<CareBotContextValue | null>(null);

export function CareBotProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [resetNonce, setResetNonce] = useState(0);

  const open = useCallback(() => {
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const resetChat = useCallback(() => {
    setResetNonce((k) => k + 1);
  }, []);

  const value = useMemo(
    () => ({ isOpen, resetNonce, open, close, resetChat }),
    [isOpen, resetNonce, open, close, resetChat],
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
