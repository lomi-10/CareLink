// hooks/shared/useNotice.tsx
// Drop-in replacement for Alert.alert().
//
// WHY: React Native's Alert is a NO-OP on react-native-web. Every Alert.alert()
// in a screen that renders on desktop fails silently — the user taps a button,
// nothing happens, and the real validation/server error is never shown. That's
// exactly what made the "Submit complaint" button look dead on web.
//
// Usage — the call signature matches Alert.alert(title, message) so swapping is 1:1:
//   const { notify, noticeHost } = useNotice();
//   notify('Check in', res.message || 'Failed to check in.', 'error');
//   return (<View>…{noticeHost}</View>);

import React, { useCallback, useState } from 'react';
import { NotificationModal } from '@/components/shared/NotificationModal';

export type NoticeType = 'success' | 'error' | 'warning' | 'info';

type NoticeState = { visible: boolean; title?: string; message: string; type: NoticeType };

export function useNotice() {
  const [notice, setNotice] = useState<NoticeState>({ visible: false, message: '', type: 'info' });

  /** Mirrors Alert.alert(title, message). Pass a type to colour it correctly. */
  const notify = useCallback((title: string, message?: string, type: NoticeType = 'info') => {
    // Alert.alert('Just this') shows the single string as the body, so match that.
    setNotice(
      message === undefined
        ? { visible: true, message: title, type }
        : { visible: true, title, message, type },
    );
  }, []);

  const hideNotice = useCallback(() => setNotice((n) => ({ ...n, visible: false })), []);

  // An element, not a component: returning a component would create a new type on
  // every render and remount the modal mid-animation.
  const noticeHost = (
    <NotificationModal
      visible={notice.visible}
      title={notice.title}
      message={notice.message}
      type={notice.type}
      onClose={hideNotice}
    />
  );

  return { notify, hideNotice, noticeHost, notice };
}
