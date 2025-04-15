import { storage, db } from './firebase';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  listAll, 
  deleteObject,
  uploadString,
  UploadMetadata
} from 'firebase/storage';
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  serverTimestamp,
  updateDoc,
  doc
} from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

// Interface voor foto metadata
interface PhotoMetadata {
  id?: string;
  name: string;
  url: string;
  thumbnailUrl?: string;
  path: string;
  size: number;
  contentType: string;
  eventName?: string;
  eventDate?: string;
  isPublic: boolean;
  photographerId: string;
  createdAt?: any;
  faceMatches?: number;
}

// Foto uploaden naar Firebase Storage
export async function uploadPhoto(
  file: File, 
  photographerId: string, 
  eventInfo?: { name?: string; date?: string },
  isPublic: boolean = true
) {
  try {
    // Genereer een unieke bestandsnaam
    const filename = `${uuidv4()}-${file.name.replace(/\s+/g, '_')}`;
    const folderPath = `photos/${photographerId}`;
    const fullPath = `${folderPath}/${filename}`;
    
    // Maak een reference naar de storage locatie
    const storageRef = ref(storage, fullPath);
    
    // Metadata voor het bestand
    const metadata: UploadMetadata = {
      contentType: file.type,
      customMetadata: {
        uploadedBy: photographerId,
        originalName: file.name,
        eventName: eventInfo?.name || '',
        eventDate: eventInfo?.date || '',
      }
    };
    
    // Upload het bestand
    const uploadResult = await uploadBytes(storageRef, file, metadata);
    
    // Haal de download URL op
    const downloadURL = await getDownloadURL(uploadResult.ref);
    
    // Sla de foto metadata op in Firestore
    const photoData: PhotoMetadata = {
      name: file.name,
      url: downloadURL,
      path: fullPath,
      size: file.size,
      contentType: file.type,
      eventName: eventInfo?.name,
      eventDate: eventInfo?.date,
      isPublic,
      photographerId,
      createdAt: serverTimestamp(),
      faceMatches: 0
    };
    
    const photoRef = await addDoc(collection(db, 'photos'), photoData);
    
    return {
      success: true,
      photoId: photoRef.id,
      url: downloadURL,
      path: fullPath,
      error: null
    };
  } catch (error: any) {
    console.error('Upload error:', error);
    return {
      success: false,
      photoId: null,
      url: null,
      path: null,
      error: error.message
    };
  }
}

// Meerdere foto's uploaden
export async function uploadMultiplePhotos(
  files: File[],
  photographerId: string,
  eventInfo?: { name?: string; date?: string },
  isPublic: boolean = true
) {
  const uploadPromises = Array.from(files).map(file => 
    uploadPhoto(file, photographerId, eventInfo, isPublic)
  );
  return Promise.all(uploadPromises);
}

// Genereer een thumbnail voor een foto
export async function generateThumbnail(
  imageUrl: string,
  photoId: string,
  photographerId: string
): Promise<{ success: boolean; thumbnailUrl?: string; error?: string }> {
  try {
    // Maak een canvas element om de thumbnail te genereren
    const img = new Image();
    
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = imageUrl;
    });
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Kan geen canvas context maken');
    }
    
    // Bereken nieuwe dimensies met behoud van aspect ratio
    const MAX_WIDTH = 300;
    const MAX_HEIGHT = 300;
    
    let width = img.width;
    let height = img.height;
    
    if (width > height) {
      if (width > MAX_WIDTH) {
        height *= MAX_WIDTH / width;
        width = MAX_WIDTH;
      }
    } else {
      if (height > MAX_HEIGHT) {
        width *= MAX_HEIGHT / height;
        height = MAX_HEIGHT;
      }
    }
    
    canvas.width = width;
    canvas.height = height;
    
    // Teken de verkleinde afbeelding op het canvas
    ctx.drawImage(img, 0, 0, width, height);
    
    // Converteer canvas naar dataURL
    const thumbnailDataUrl = canvas.toDataURL('image/jpeg', 0.7);
    
    // Upload de thumbnail naar Firebase Storage
    const thumbnailPath = `thumbnails/${photographerId}/${photoId}.jpg`;
    const storageRef = ref(storage, thumbnailPath);
    
    // Upload de thumbnail van dataURL formaat
    await uploadString(storageRef, thumbnailDataUrl, 'data_url');
    
    // Haal de download URL op
    const thumbnailUrl = await getDownloadURL(storageRef);
    
    // Update het foto document met de thumbnail URL
    await updateDoc(doc(db, 'photos', photoId), {
      thumbnailUrl: thumbnailUrl
    });
    
    return {
      success: true,
      thumbnailUrl
    };
  } catch (error: any) {
    console.error('Thumbnail generation error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Foto's ophalen voor een fotograaf of evenement
export async function getPhotos(filters: {
  photographerId?: string;
  eventName?: string;
  isPublic?: boolean;
}) {
  try {
    // Bouw de query op basis van de filters
    let photoQuery = collection(db, 'photos');
    let constraints = [];
    
    if (filters.photographerId) {
      constraints.push(where('photographerId', '==', filters.photographerId));
    }
    
    if (filters.eventName) {
      constraints.push(where('eventName', '==', filters.eventName));
    }
    
    if (filters.isPublic !== undefined) {
      constraints.push(where('isPublic', '==', filters.isPublic));
    }
    
    const q = constraints.length > 0 ? query(photoQuery, ...constraints) : photoQuery;
    
    const querySnapshot = await getDocs(q);
    const photos: any[] = [];
    
    querySnapshot.forEach((doc) => {
      photos.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return {
      success: true,
      photos,
      error: null
    };
  } catch (error: any) {
    console.error('Get photos error:', error);
    return {
      success: false,
      photos: [],
      error: error.message
    };
  }
}

// Foto verwijderen
export async function deletePhoto(photoId: string, path: string) {
  try {
    // Controleer eerst of het bestand bestaat in Storage
    const storageRef = ref(storage, path);
    
    // Verwijder bestand uit Storage
    await deleteObject(storageRef);
    
    // Verwijder metadata uit Firestore
    await updateDoc(doc(db, 'photos', photoId), {
      deleted: true,
      deletedAt: serverTimestamp()
    });
    
    return {
      success: true,
      error: null
    };
  } catch (error: any) {
    console.error('Delete photo error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
