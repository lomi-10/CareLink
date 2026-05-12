import AsyncStorage from '@react-native-async-storage/async-storage';

/** Append staff_user_id for PESO JSON/read endpoints when the logged-in user is PESO staff. */
export async function withPesoStaffQuery(url: string): Promise<string> {
  try {
    const raw = await AsyncStorage.getItem('user_data');
    if (!raw) return url;
    const u = JSON.parse(raw) as { user_type?: string; user_id?: string | number };
    if (String(u.user_type ?? '').toLowerCase() !== 'peso') return url;
    const id = u.user_id != null ? String(u.user_id) : '';
    if (!id) return url;
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}staff_user_id=${encodeURIComponent(id)}`;
  } catch {
    return url;
  }
}
