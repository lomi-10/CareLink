import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import API_URL from '@/constants/api';
import { withPesoStaffQuery } from '@/lib/pesoStaffQuery';

export type Announcement = {
  announcement_id: number;
  title: string;
  body: string;
  image_path: string | null;
  created_at: string;
};

type AnnouncementImage = {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
  file?: Blob | null;
};

type ApiResponse<T> = { success?: boolean; message?: string; data?: T };

export function announcementImageUrl(path: string | null): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const apiBaseUrl = API_URL.endsWith('/') ? API_URL : `${API_URL}/`;
  return new URL(path.replace(/^\/+/, ''), apiBaseUrl).toString();
}

async function readResponse<T>(response: Response, fallback: string): Promise<T> {
  const result = await response.json() as ApiResponse<T>;
  if (!response.ok || !result.success) {
    throw new Error(result.message || fallback);
  }
  return result.data as T;
}

async function appendAnnouncementImage(form: FormData, image: AnnouncementImage): Promise<void> {
  const extension = image.mimeType?.includes('png') ? 'png' : image.mimeType?.includes('webp') ? 'webp' : 'jpg';
  const name = image.fileName || `announcement.${extension}`;
  if (image.file) {
    form.append('image', image.file, name);
  } else if (Platform.OS === 'web') {
    const response = await fetch(image.uri);
    if (!response.ok) throw new Error('Could not read the selected image.');
    const blob = await response.blob();
    form.append('image', blob, name);
  } else {
    form.append('image', { uri: image.uri, name, type: image.mimeType || 'image/jpeg' } as unknown as Blob);
  }
}

async function postAnnouncement(form: FormData, fallback: string): Promise<void> {
  const url = await withPesoStaffQuery(`${API_URL}/peso/manage_announcements.php`);
  const response = await fetch(url, { method: 'POST', body: form });
  await readResponse<unknown>(response, fallback);
}

export async function fetchAnnouncements(userId: number): Promise<Announcement[]> {
  const response = await fetch(`${API_URL}/shared/get_announcements.php?user_id=${encodeURIComponent(String(userId))}`);
  const data = await readResponse<{ announcements?: Announcement[] }>(response, 'Could not load announcements.');
  return data.announcements ?? [];
}

export async function fetchPesoAnnouncements(): Promise<Announcement[]> {
  const url = await withPesoStaffQuery(`${API_URL}/peso/manage_announcements.php`);
  const response = await fetch(url);
  const data = await readResponse<{ announcements?: Announcement[] }>(response, 'Could not load announcements.');
  return data.announcements ?? [];
}

export async function publishAnnouncement(title: string, body: string, image?: AnnouncementImage): Promise<void> {
  const raw = await AsyncStorage.getItem('user_data');
  if (!raw) throw new Error('PESO staff account not found. Please sign in again.');
  const user = JSON.parse(raw) as { user_id?: string | number; user_type?: string };
  if (String(user.user_type ?? '').toLowerCase() !== 'peso' || !user.user_id) {
    throw new Error('Only PESO staff can publish announcements.');
  }

  const form = new FormData();
  form.append('title', title.trim());
  form.append('body', body.trim());
  if (image) await appendAnnouncementImage(form, image);
  await postAnnouncement(form, 'Could not publish announcement.');
}

export async function updateAnnouncement(
  announcementId: number,
  title: string,
  body: string,
  options: { image?: AnnouncementImage; removeImage?: boolean } = {},
): Promise<void> {
  const form = new FormData();
  form.append('action', 'edit');
  form.append('announcement_id', String(announcementId));
  form.append('title', title.trim());
  form.append('body', body.trim());
  form.append('remove_image', options.removeImage ? '1' : '0');
  if (options.image) await appendAnnouncementImage(form, options.image);
  await postAnnouncement(form, 'Could not update announcement.');
}

export async function deleteAnnouncement(announcementId: number): Promise<void> {
  const form = new FormData();
  form.append('action', 'delete');
  form.append('announcement_id', String(announcementId));
  await postAnnouncement(form, 'Could not delete announcement.');
}
