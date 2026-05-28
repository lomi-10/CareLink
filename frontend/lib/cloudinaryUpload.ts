/**
 * Unsigned upload to Cloudinary (set EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME + EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET).
 * Create an unsigned upload preset in the Cloudinary dashboard and enable unsigned uploads.
 */
export async function uploadImageToCloudinary(localUri: string): Promise<string | null> {
  const cloud = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const preset = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
  if (!cloud || !preset) {
    console.warn('Cloudinary: set EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME and EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET');
    return null;
  }

  const form = new FormData();
  form.append('file', {
    uri: localUri,
    name: 'task.jpg',
    type: 'image/jpeg',
  } as unknown as Blob);
  form.append('upload_preset', preset);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, {
    method: 'POST',
    body: form,
  });
  const json = (await res.json()) as { secure_url?: string; error?: { message?: string } };
  if (!res.ok) {
    console.warn('Cloudinary upload failed', json?.error?.message);
    return null;
  }
  return json.secure_url ?? null;
}
