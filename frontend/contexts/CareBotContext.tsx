import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

export type CareBotAction = { label: string; route: string };

export type CareBotLine = {
  id: string;
  text: string;
  createdAt: number;
  side: 'user' | 'bot';
  actions?: CareBotAction[];
};

type CareBotContextValue = {
  isOpen: boolean;
  open: () => void;
  close: () => void;

  /**
   * The conversation lives HERE, not in the chat panel.
   *
   * React Native's <Modal> renders nothing while `visible` is false, so the
   * panel inside it is fully unmounted every time CareBot is closed — taking
   * any local useState with it. That is why the transcript kept vanishing on
   * close even after the reset-on-open bug was fixed: nothing was resetting
   * it, the component holding it simply ceased to exist.
   *
   * Holding it in the provider (which sits above the modal and never
   * unmounts) is what actually makes a conversation survive being closed and
   * reopened. It is cleared only on logout, via resetChat().
   */
  lines: CareBotLine[];
  setLines: React.Dispatch<React.SetStateAction<CareBotLine[]>>;
  draft: string;
  setDraft: React.Dispatch<React.SetStateAction<string>>;

  /** Call on logout so the next signed-in user starts a fresh conversation. */
  resetChat: () => void;
};

const CareBotContext = createContext<CareBotContextValue | null>(null);

export function CareBotProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [lines, setLines] = useState<CareBotLine[]>([]);
  const [draft, setDraft] = useState('');

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  const resetChat = useCallback(() => {
    setLines([]);
    setDraft('');
  }, []);

  const value = useMemo(
    () => ({ isOpen, open, close, lines, setLines, draft, setDraft, resetChat }),
    [isOpen, open, close, lines, draft, resetChat],
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
