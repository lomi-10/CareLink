// app/(helper)/messages/messagesAppearance.ts
import React from 'react';
import { createHelperMessagesStyles } from './messages.styles';

export type MessagesAppearanceValue = {
  s: ReturnType<typeof createHelperMessagesStyles>;
};

export const MessagesAppearanceContext = React.createContext<MessagesAppearanceValue | null>(null);

export function useMessagesAppearance(): MessagesAppearanceValue {
  const v = React.useContext(MessagesAppearanceContext);
  if (!v) throw new Error('Messages appearance unavailable');
  return v;
}
