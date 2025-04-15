import { db, rtdb } from './firebase';
import { ref as rtdbRef, set, get } from 'firebase/database';
import { collection, addDoc, serverTimestamp, doc, updateDoc, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

// Interfaces voor foto's en statistieken
export interface PhotoMetadata {
  id: string;
  name: string;
  size: number;
  contentType: string;
  photographerId: string;
  eventName?: string | null;
  tags?: string[];
  isPublic?: boolean;
  createdAt: any;
  updatedAt?: any;
  base64?: string;
}

export interface PhotoStatistics {
  totalPhotos: number;
  publicPhotos: number;
  privatePhotos: number;
  eventPhotos: Record<string, number>;
}

// Comprimeer afbeelding voordat deze wordt geüpload
function compressImage(file: File, maxWidth = 800, maxHeight = 800): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Alleen afbeeldingsbestanden zijn toegestaan');
  }

  // Controleer bestandsgrootte (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('Afbeelding is te groot (max 10MB)');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Schaal indien nodig
        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL(file.type, 0.7)); // 70% kwaliteit
      };
    };
    reader.onerror = (error) => reject(error);
  });
}

// Upload meerdere foto's tegelijk
export async function uploadMultiplePhotos(
  files: File[], 
  photographerId: string, 
  options: {
    eventName?: string;
    tags?: string[];
    isPublic?: boolean;
  } = {}
): Promise<{
  success: boolean;
  uploadedPhotos: PhotoMetadata[];
  errors?: string[];
}> {
  const uploadedPhotos: PhotoMetadata[] = [];
  const errors: string[] = [];

  for (const file of files) {
    try {
      const result = await uploadPhoto(file, photographerId, options);
      if (result.success && result.metadata) {
        uploadedPhotos.push(result.metadata);
      } else {
        errors.push(`Fout bij uploaden: ${result.error}`);
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Onbekende fout');
    }
  }

  return {
    success: errors.length === 0,
    uploadedPhotos,
    errors
  };
}

// Upload individuele foto
export async function uploadPhoto(
  file: File, 
  photographerId: string, 
  options: {
    eventName?: string;
    tags?: string[];
    isPublic?: boolean;
  } = {}
) {
  try {
    // Comprimeer afbeelding
    const compressedImage = await compressImage(file);
    
    // Genereer unieke ID
    const photoId = uuidv4();
    
    // Metadata voor Firestore
    const photoMetadata: PhotoMetadata = {
      id: photoId,
      name: file.name,
      size: file.size,
      contentType: file.type,
      photographerId,
      eventName: options.eventName || null,
      tags: options.tags || [],
      isPublic: options.isPublic ?? false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    // Sla metadata op in Firestore
    await addDoc(collection(db, 'photos'), photoMetadata);
    
    // Sla foto Base64 op in Realtime Database
    const rtdbPhotoRef = rtdbRef(rtdb, `photos/${photographerId}/${photoId}`);
    await set(rtdbPhotoRef, {
      base64: compressedImage,
      metadata: photoMetadata
    });
    
    return {
      success: true,
      photoId: photoId,
      metadata: photoMetadata
    };
  } catch (error) {
    console.error('Fout bij uploaden foto:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Onbekende fout'
    };
  }
}

// Foto's ophalen voor een specifieke fotograaf
export async function getPhotosByPhotographer(photographerId: string, options: {
  limit?: number;
  eventName?: string;
  tags?: string[];
} = {}): Promise<PhotoMetadata[]> {
  try {
    const { limit = 50, eventName, tags } = options;
    
    // Query voor Firestore
    let baseQuery = query(collection(db, 'photos'), 
      where('photographerId', '==', photographerId),
      orderBy('createdAt', 'desc'),
      limit(limit)
    );
    
    // Optionele filters
    if (eventName) {
      baseQuery = query(baseQuery, where('eventName', '==', eventName));
    }
    
    if (tags && tags.length > 0) {
      baseQuery = query(baseQuery, where('tags', 'array-contains-any', tags));
    }
    
    const photoSnapshot = await getDocs(baseQuery);
    const photos: PhotoMetadata[] = photoSnapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    } as PhotoMetadata));
    
    // Haal Base64 data op uit Realtime Database
    const photosWithData = await Promise.all(photos.map(async (photo) => {
      const photoRef = rtdbRef(rtdb, `photos/${photographerId}/${photo.id}`);
      const snapshot = await get(photoRef);
      return {
        ...photo,
        base64: snapshot.val()?.base64 || null
      };
    }));
    
    return photosWithData;
  } catch (error) {
    console.error('Fout bij ophalen foto\'s:', error);
    return [];
  }
}

// Zoek foto's op basis van filters
export async function searchPhotos(filters: {
  photographerId?: string;
  eventName?: string;
  tags?: string[];
  isPublic?: boolean;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
} = {}): Promise<PhotoMetadata[]> {
  try {
    const { 
      photographerId, 
      eventName, 
      tags, 
      isPublic, 
      startDate, 
      endDate, 
      limit = 50 
    } = filters;

    let baseQuery = query(
      collection(db, 'photos'),
      orderBy('createdAt', 'desc'),
      limit(limit)
    );

    // Voeg filters toe
    if (photographerId) {
      baseQuery = query(baseQuery, where('photographerId', '==', photographerId));
    }

    if (eventName) {
      baseQuery = query(baseQuery, where('eventName', '==', eventName));
    }

    if (tags && tags.length > 0) {
      baseQuery = query(baseQuery, where('tags', 'array-contains-any', tags));
    }

    if (isPublic !== undefined) {
      baseQuery = query(baseQuery, where('isPublic', '==', isPublic));
    }

    if (startDate) {
      baseQuery = query(baseQuery, where('createdAt', '>=', startDate));
    }

    if (endDate) {
      baseQuery = query(baseQuery, where('createdAt', '<=', endDate));
    }

    const photoSnapshot = await getDocs(baseQuery);
    const photos: PhotoMetadata[] = photoSnapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    } as PhotoMetadata));

    return photos;
  } catch (error) {
    console.error('Fout bij zoeken foto\'s:', error);
    return [];
  }
}

// Foto verwijderen (soft delete)
export async function deletePhoto(photoId: string, photographerId: string) {
  try {
    // Verwijder foto uit Realtime Database
    const rtdbPhotoRef = rtdbRef(rtdb, `photos/${photographerId}/${photoId}`);
    await set(rtdbPhotoRef, null);
    
    // Markeer foto als verwijderd in Firestore
    const photoRef = doc(db, 'photos', photoId);
    await updateDoc(photoRef, {
      isDeleted: true,
      deletedAt: serverTimestamp()
    });
    
    return { success: true };
  } catch (error) {
    console.error('Fout bij verwijderen foto:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Onbekende fout' 
    };
  }
}

// Foto statistieken ophalen
export async function getPhotoStatistics(photographerId: string): Promise<PhotoStatistics> {
  try {
    const baseQuery = query(
      collection(db, 'photos'),
      where('photographerId', '==', photographerId)
    );
    
    const photoSnapshot = await getDocs(baseQuery);
    const photos = photoSnapshot.docs.map(doc => doc.data());
    
    const statistics: PhotoStatistics = {
      totalPhotos: photos.length,
      publicPhotos: photos.filter(p => p.isPublic).length,
      privatePhotos: photos.filter(p => !p.isPublic).length,
      eventPhotos: photos.reduce((acc, photo) => {
        if (photo.eventName) {
          acc[photo.eventName] = (acc[photo.eventName] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>)
    };
    
    return statistics;
  } catch (error) {
    console.error('Fout bij ophalen foto statistieken:', error);
    return {
      totalPhotos: 0,
      publicPhotos: 0,
      privatePhotos: 0,
      eventPhotos: {}
    };
  }
}

// Database Rules voor Realtime Database
// Zet deze in firebase.rules.json
/*
{
  "rules": {
    "photos": {
      "$photographerId": {
        "$photoId": {
          ".read": "auth != null && auth.uid == $photographerId",
          ".write": "auth != null && auth.uid == $photographerId"
        }
      }
    }
  }
}
*/

// Database Rules voor Firestore
// Zet deze in firestore.rules
/*
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /photos/{photoId} {
      allow read: if request.auth != null && request.auth.uid == resource.data.photographerId;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && request.auth.uid == resource.data.photographerId;
    }
  }
}
*/