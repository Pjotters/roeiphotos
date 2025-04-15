import { db, storage } from './firebase';
import { 
  doc, 
  getDoc, 
  setDoc, 
  addDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  updateDoc, 
  serverTimestamp,
  deleteDoc,
  increment
} from 'firebase/firestore';
import * as faceapi from 'face-api.js';
import { detectFace, processImageForFaceDetection } from './faceRecognition';

// Interface voor gezichtsdata
interface FaceData {
  descriptor: number[];
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  landmarks?: {
    x: number;
    y: number;
  }[];
  updatedAt: string;
}

// Interface voor gezichtsmatch
interface FaceMatch {
  id?: string;
  photoId: string;
  rowerId: string;
  confidence: number;
  coordinates: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  approved: boolean;
  createdAt?: any;
  updatedAt?: any;
}

// Gezichtsdata opslaan voor een roeier
export async function saveFaceData(rowerId: string, faceResults: any[]) {
  try {
    // Selecteer de beste gezichten en bereken gemiddelde descriptor
    if (!faceResults || faceResults.length < 3) {
      throw new Error('Minimaal 3 geldige gezichtsafbeeldingen zijn vereist');
    }
    
    // Filter resultaten waar daadwerkelijk een gezicht is gedetecteerd
    const validResults = faceResults.filter(result => result && result.descriptor);
    
    if (validResults.length < 3) {
      throw new Error(`Minimaal 3 geldige gezichtsafbeeldingen zijn vereist, er zijn er maar ${validResults.length} gevonden`);
    }
    
    // Selecteer de beste resultaten op basis van gezichtsgrootte
    const bestFaces = validResults.sort((a, b) => {
      const areaA = a.boundingBox.width * a.boundingBox.height;
      const areaB = b.boundingBox.width * b.boundingBox.height;
      return areaB - areaA; // Grootste gezichten eerst
    }).slice(0, Math.min(5, validResults.length)); // Maximaal 5 nemen
    
    // Bereken gemiddelde descriptor
    const descriptors = bestFaces.map(result => result.descriptor);
    const average = new Float32Array(descriptors[0].length);
    
    for (let i = 0; i < average.length; i++) {
      let sum = 0;
      for (let j = 0; j < descriptors.length; j++) {
        sum += descriptors[j][i];
      }
      average[i] = sum / descriptors.length;
    }
    
    const averageDescriptor = Array.from(average);
    
    // Maak de gezichtsdata object
    const faceData = {
      descriptor: averageDescriptor,
      faces: bestFaces.map(face => ({
        descriptor: face.descriptor,
        boundingBox: face.boundingBox
      })),
      updatedAt: new Date().toISOString()
    };
    
    // Update de roeier in Firebase
    const rowerRef = doc(db, 'rowers', rowerId);
    await updateDoc(rowerRef, {
      faceData: faceData,
      faceUpdatedAt: serverTimestamp()
    });
    
    return { 
      success: true, 
      error: null 
    };
  } catch (error: any) {
    console.error('Save face data error:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
}

// Haal alle roeiers op met gezichtsdata
export async function getRowerFaceData() {
  try {
    const q = query(collection(db, 'rowers'), where('faceData', '!=', null));
    const querySnapshot = await getDocs(q);
    
    const rowers: any[] = [];
    
    // Haal voor elke roeier ook de bijbehorende gebruikersgegevens op
    for (const docSnapshot of querySnapshot.docs) {
      const rowerData = docSnapshot.data();
      
      // Haal gebruikersgegevens op
      const userData = await getDoc(doc(db, 'users', rowerData.userId));
      
      if (userData.exists()) {
        rowers.push({
          id: docSnapshot.id,
          ...rowerData,
          user: userData.data()
        });
      }
    }
    
    return { 
      success: true, 
      rowers, 
      error: null 
    };
  } catch (error: any) {
    console.error('Get rowers with face data error:', error);
    return { 
      success: false, 
      rowers: [], 
      error: error.message 
    };
  }
}

// Match een foto tegen de database van bekende gezichten
export async function matchFaceWithDatabase(faceDescriptor: number[], threshold = 0.6) {
  try {
    // Haal alle roeiers met gezichtsdata op
    const { success, rowers } = await getRowerFaceData();
    
    if (!success || !rowers.length) {
      return { 
        success: true, 
        match: null, 
        error: null 
      };
    }
    
    // Maak array van bekende gezichten
    const knownFaces = rowers.map((rower: any) => ({
      id: rower.id,
      descriptor: rower.faceData.descriptor,
      user: rower.user
    }));
    
    // Convert query descriptor to Float32Array
    const queryDescriptor = new Float32Array(faceDescriptor);
    
    // Vind de beste match
    let bestMatch = null;
    let bestDistance = Infinity;
    
    for (const knownFace of knownFaces) {
      const knownDescriptor = new Float32Array(knownFace.descriptor);
      const distance = faceapi.euclideanDistance(queryDescriptor, knownDescriptor);
      
      if (distance < bestDistance) {
        bestDistance = distance;
        bestMatch = knownFace;
      }
    }
    
    // Convert distance to confidence (0-1)
    const confidence = Math.max(0, Math.min(1, 1 - bestDistance));
    
    // Alleen matchen boven de threshold accepteren
    if (confidence >= threshold && bestMatch !== null) {
      return {
        success: true,
        match: {
          id: bestMatch.id,
          confidence,
          distance: bestDistance,
          user: bestMatch.user
        },
        error: null
      };
    }
    
    return { 
      success: true, 
      match: null, 
      error: null 
    };
  } catch (error: any) {
    console.error('Match face with database error:', error);
    return { 
      success: false, 
      match: null, 
      error: error.message 
    };
  }
}

// Verwerk een foto voor gezichtsherkenning
export async function processPhotoForFaceRecognition(photoId: string, photoUrl: string) {
  try {
    // Detecteer alle gezichten in de foto
    const result = await processImageForFaceDetection(photoUrl);
    
    if (!result) {
      return {
        success: true,
        message: 'Geen gezichten gedetecteerd in de foto',
        matches: []
      };
    }
    
    // Array voor gedetecteerde gezichten
    const detectedFaces = Array.isArray(result) ? result : [result];
    const matches: any[] = [];
    
    // Probeer voor elk gedetecteerd gezicht een match te vinden
    for (const face of detectedFaces) {
      if (face && face.descriptor) {
        const matchResult = await matchFaceWithDatabase(face.descriptor);
        
        if (matchResult.success && matchResult.match) {
          // Voeg gezichtsmatch toe aan de database
          const faceMatchData: FaceMatch = {
            photoId,
            rowerId: matchResult.match.id,
            confidence: matchResult.match.confidence,
            coordinates: face.boundingBox,
            approved: false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          };
          
          const matchDoc = await addDoc(collection(db, 'faceMatches'), faceMatchData);
          
          // Update foto met aantal matches
          const photoRef = doc(db, 'photos', photoId);
          await updateDoc(photoRef, {
            faceMatches: increment(1),
            updatedAt: serverTimestamp()
          });
          
          matches.push({
            id: matchDoc.id,
            ...faceMatchData,
            rower: matchResult.match.user
          });
        }
      }
    }
    
    return {
      success: true,
      message: `${matches.length} roeier(s) herkend in de foto`,
      matches
    };
  } catch (error: any) {
    console.error('Process photo for face recognition error:', error);
    return {
      success: false,
      message: error.message,
      matches: []
    };
  }
}

// Haal alle gezichtsmatches op
export async function getFaceMatches(filters: {
  photoId?: string;
  rowerId?: string;
  photographerId?: string;
  approved?: boolean;
}) {
  try {
    let matchesQuery = collection(db, 'faceMatches');
    let constraints = [];
    
    if (filters.photoId) {
      constraints.push(where('photoId', '==', filters.photoId));
    }
    
    if (filters.rowerId) {
      constraints.push(where('rowerId', '==', filters.rowerId));
    }
    
    if (filters.approved !== undefined) {
      constraints.push(where('approved', '==', filters.approved));
    }
    
    const q = constraints.length > 0 ? query(matchesQuery, ...constraints) : matchesQuery;
    const querySnapshot = await getDocs(q);
    
    const matches: any[] = [];
    
    // Voor elke match, haal de foto- en roeiergegevens op
    for (const matchDoc of querySnapshot.docs) {
      const matchData = matchDoc.data();
      
      // Haal foto op
      const photoDoc = await getDoc(doc(db, 'photos', matchData.photoId));
      
      // Haal roeier op
      const rowerDoc = await getDoc(doc(db, 'rowers', matchData.rowerId));
      
      // Haal gebruiker op voor de roeier
      let userData = null;
      if (rowerDoc.exists()) {
        const userDoc = await getDoc(doc(db, 'users', rowerDoc.data().userId));
        if (userDoc.exists()) {
          userData = userDoc.data();
        }
      }
      
      // Als we filteren op photographer, controleer of de foto van die fotograaf is
      if (filters.photographerId && photoDoc.exists()) {
        const photoData = photoDoc.data();
        if (photoData.photographerId !== filters.photographerId) {
          continue; // Sla deze match over
        }
      }
      
      matches.push({
        id: matchDoc.id,
        ...matchData,
        photo: photoDoc.exists() ? {
          id: photoDoc.id,
          ...photoDoc.data()
        } : null,
        rower: rowerDoc.exists() ? {
          id: rowerDoc.id,
          ...rowerDoc.data(),
          user: userData
        } : null
      });
    }
    
    return { 
      success: true, 
      matches, 
      error: null 
    };
  } catch (error: any) {
    console.error('Get face matches error:', error);
    return { 
      success: false, 
      matches: [], 
      error: error.message 
    };
  }
}

// Update een gezichtsmatch (goedkeuren of afkeuren)
export async function updateFaceMatch(matchId: string, approved: boolean) {
  try {
    const matchRef = doc(db, 'faceMatches', matchId);
    
    await updateDoc(matchRef, {
      approved,
      updatedAt: serverTimestamp()
    });
    
    return { 
      success: true, 
      error: null 
    };
  } catch (error: any) {
    console.error('Update face match error:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
}

// Verwijder een gezichtsmatch
export async function deleteFaceMatch(matchId: string) {
  try {
    // Haal eerst de match op om de photoId te krijgen
    const matchDoc = await getDoc(doc(db, 'faceMatches', matchId));
    
    if (!matchDoc.exists()) {
      throw new Error('Gezichtsmatch niet gevonden');
    }
    
    const matchData = matchDoc.data();
    
    // Verwijder de match
    await deleteDoc(doc(db, 'faceMatches', matchId));
    
    // Update foto met aantal matches
    const photoRef = doc(db, 'photos', matchData.photoId);
    await updateDoc(photoRef, {
      faceMatches: increment(-1),
      updatedAt: serverTimestamp()
    });
    
    return { 
      success: true, 
      error: null 
    };
  } catch (error: any) {
    console.error('Delete face match error:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
}
