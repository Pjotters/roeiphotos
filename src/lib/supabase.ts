import { createClient } from '@supabase/supabase-js';

// Deze waarden komen uit je Supabase project dashboard
// Ze moeten in een .env bestand worden opgeslagen voor veiligheid
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Maak een Supabase client aan om te gebruiken in je applicatie
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper functies voor foto upload
export async function uploadPhoto(file: File, path: string) {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    const filePath = `${path}/${fileName}`;

    const { data, error } = await supabase.storage
      .from('photos')
      .upload(filePath, file);

    if (error) throw error;
    
    // Haal de publieke URL op voor de foto
    const { data: publicURLData } = supabase.storage
      .from('photos')
      .getPublicUrl(filePath);

    return {
      path: filePath,
      url: publicURLData.publicUrl
    };
  } catch (error) {
    console.error('Error uploading photo:', error);
    throw error;
  }
}

// Helper functie om meerdere foto's in bulk te uploaden
export async function uploadMultiplePhotos(files: File[], path: string) {
  try {
    const uploadPromises = files.map(file => uploadPhoto(file, path));
    return await Promise.all(uploadPromises);
  } catch (error) {
    console.error('Error uploading multiple photos:', error);
    throw error;
  }
}

// Helper functie om foto's te verwijderen
export async function deletePhoto(path: string) {
  try {
    const { error } = await supabase.storage
      .from('photos')
      .remove([path]);
      
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting photo:', error);
    throw error;
  }
}

// Helper functie om foto's te halen uit een bepaalde map
export async function listPhotos(path: string) {
  try {
    const { data, error } = await supabase.storage
      .from('photos')
      .list(path);
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error listing photos:', error);
    throw error;
  }
}
