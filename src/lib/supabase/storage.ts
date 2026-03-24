import { createClient } from './client';

const supabase = createClient();

export async function uploadCheckinPhoto(
  userId: string,
  file: File
): Promise<{ url: string; path: string } | null> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/${Date.now()}.${fileExt}`;

  const { data, error } = await supabase.storage
    .from('checkins')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    console.error('Error uploading checkin photo:', error);
    return null;
  }

  const { data: urlData } = supabase.storage
    .from('checkins')
    .getPublicUrl(data.path);

  return {
    url: urlData.publicUrl,
    path: data.path,
  };
}

export async function uploadAvatar(
  userId: string,
  file: File
): Promise<{ url: string; path: string } | null> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/avatar.${fileExt}`;

  const { data, error } = await supabase.storage
    .from('avatars')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: true,
    });

  if (error) {
    console.error('Error uploading avatar:', error);
    return null;
  }

  const { data: urlData } = supabase.storage
    .from('avatars')
    .getPublicUrl(data.path);

  return {
    url: urlData.publicUrl,
    path: data.path,
  };
}

export async function deleteCheckinPhoto(path: string): Promise<boolean> {
  const { error } = await supabase.storage.from('checkins').remove([path]);

  if (error) {
    console.error('Error deleting checkin photo:', error);
    return false;
  }

  return true;
}

export async function getCheckinPhotos(userId: string): Promise<string[]> {
  const { data, error } = await supabase.storage
    .from('checkins')
    .list(userId, {
      sortBy: { column: 'created_at', order: 'desc' },
    });

  if (error) {
    console.error('Error listing checkin photos:', error);
    return [];
  }

  return data.map((file) => {
    const { data: urlData } = supabase.storage
      .from('checkins')
      .getPublicUrl(`${userId}/${file.name}`);
    return urlData.publicUrl;
  });
}
