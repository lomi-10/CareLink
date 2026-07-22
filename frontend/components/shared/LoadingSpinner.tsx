// components/shared/LoadingSpinner.tsx
//
// The name and the { visible, message } API are unchanged so all 13 call sites
// keep working — but the insides are now the branded loader instead of a blue
// iOS ActivityIndicator (#007AFF) on a white card, which matched nothing else
// in the app.
//
// Every blocking wait in CareLink now shows the same orbiting logo + progress bar.
import React from 'react';
import { Modal } from 'react-native';
import { BrandLoader } from '@/components/branding/BrandLoader';

interface LoadingSpinnerProps {
  visible: boolean;
  message?: string;
  /** Drop the wordmark/tagline for a briefer in-page wait. */
  compact?: boolean;
}

export function LoadingSpinner({ visible, message = 'Loading…', compact = false }: LoadingSpinnerProps) {
  return (
    <Modal transparent={false} visible={visible} animationType="fade">
      <BrandLoader
        message={message}
        showWordmark={!compact}
        logoSize={compact ? 76 : 104}
      />
    </Modal>
  );
}
