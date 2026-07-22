// lib/profileChange.ts
// Client for the verified email / contact-number change flow.
// PHP: auth/request_profile_change.php, auth/confirm_profile_change.php

import API_URL from '@/constants/api';

export type ChangeField = 'email' | 'contact';

export interface RequestChangeResult { success: boolean; message: string; sent_to?: string }
export interface ConfirmChangeResult { success: boolean; message: string; value?: string }

/** Ask the server to email a 6-digit code for changing `field` to `value`. */
export async function requestFieldChange(userId: string | number, field: ChangeField, value: string): Promise<RequestChangeResult> {
  try {
    const res = await fetch(`${API_URL}/auth/request_profile_change.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, requester_id: userId, field, value }),
    });
    return await res.json();
  } catch {
    return { success: false, message: 'Could not reach the server. Check your connection.' };
  }
}

/** Confirm the code; the server applies the value it was issued for. */
export async function confirmFieldChange(userId: string | number, field: ChangeField, code: string): Promise<ConfirmChangeResult> {
  try {
    const res = await fetch(`${API_URL}/auth/confirm_profile_change.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, requester_id: userId, field, code }),
    });
    return await res.json();
  } catch {
    return { success: false, message: 'Could not reach the server. Check your connection.' };
  }
}
