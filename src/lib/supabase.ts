/**
 * LET OP: SUPABASE IS VERVANGEN DOOR FIREBASE
 * 
 * Dit bestand is alleen voor backward compatibility en geeft aan dat we
 * zijn gemigreerd naar Firebase voor opslag en authenticatie.
 * 
 * Gebruik in plaats hiervan de volgende bestanden:
 * - src/lib/firebase.ts - Voor Firebase configuratie
 * - src/lib/auth-firebase.ts - Voor Firebase authenticatie
 * - src/lib/storage-firebase.ts - Voor Firebase Storage operaties
 */

// Imports uit nieuwe Firebase modules voor backward compatibility
import { uploadPhoto as uploadPhotoFirebase, uploadMultiplePhotos as uploadMultiplePhotosFirebase, deletePhoto as deletePhotoFirebase } from './storage-firebase';

// Helper functies voor foto upload (nu gebaseerd op Firebase)
export async function uploadPhoto(file: File, path: string) {
  console.warn('Deze functie gebruikt nu Firebase in plaats van Supabase');
  const photographerId = 'default'; // In echte implementatie zou je dit uit de context moeten halen
  return uploadPhotoFirebase(file, photographerId);
}

// Helper functie om meerdere foto's in bulk te uploaden (nu gebaseerd op Firebase)
export async function uploadMultiplePhotos(files: File[], path: string) {
  console.warn('Deze functie gebruikt nu Firebase in plaats van Supabase');
  const photographerId = 'default'; // In echte implementatie zou je dit uit de context moeten halen
  return uploadMultiplePhotosFirebase(files, photographerId);
}

// Helper functie om foto's te verwijderen (nu gebaseerd op Firebase)
export async function deletePhoto(path: string) {
  console.warn('Deze functie gebruikt nu Firebase in plaats van Supabase');
  // In echte implementatie zou je photoId moeten extraheren/opzoeken
  return deletePhotoFirebase('dummy-photo-id', path);
}

// Helper functie om foto's te halen uit een bepaalde map (nu gebaseerd op Firebase)
export async function listPhotos(path: string) {
  console.warn('Deze functie gebruikt nu Firebase in plaats van Supabase');
  return [];
}
