import * as faceapi from 'face-api.js';

// Pad naar de model bestanden
const MODEL_URL = '/models';

// Flag om bij te houden of de modellen al geladen zijn
let modelsLoaded = false;

// Functie om alle benodigde modellen te laden
export async function loadModels() {
  if (modelsLoaded) return;
  
  try {
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
    ]);
    
    modelsLoaded = true;
    console.log('Face-api modellen succesvol geladen');
  } catch (error) {
    console.error('Fout bij het laden van face-api modellen:', error);
    throw new Error('Gezichtsherkenningsmodellen konden niet worden geladen');
  }
}

// Functie om een gezicht te detecteren en descriptoren te extraheren uit een afbeelding
export async function detectFace(imageElement: HTMLImageElement) {
  await loadModels();
  
  try {
    // Detecteer alle gezichten in de afbeelding
    const detections = await faceapi.detectAllFaces(imageElement)
      .withFaceLandmarks()
      .withFaceDescriptors();
    
    if (detections.length === 0) {
      return null;
    }
    
    // Geef de grootste (meest prominente) gezichtsdetectie terug
    if (detections.length > 1) {
      // Sort op grootte (box area)
      detections.sort((a, b) => {
        const areaA = a.detection.box.area;
        const areaB = b.detection.box.area;
        return areaB - areaA; // Grootste eerst
      });
    }
    
    return {
      descriptor: Array.from(detections[0].descriptor),
      boundingBox: detections[0].detection.box.toJSON(),
      landmarks: detections[0].landmarks.positions.map(p => ({ x: p.x, y: p.y })),
      allDetections: detections.map(d => ({
        descriptor: Array.from(d.descriptor),
        boundingBox: d.detection.box.toJSON()
      }))
    };
  } catch (error) {
    console.error('Fout bij de gezichtsdetectie:', error);
    throw new Error('Gezichtsdetectie is mislukt');
  }
}

// Functie om een afbeelding als dataURL te verwerken voor gezichtsdetectie
export async function processImageForFaceDetection(imageDataUrl: string): Promise<any> {
  await loadModels();
  
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = async () => {
      try {
        const result = await detectFace(img);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    };
    img.onerror = (err) => {
      reject('Afbeelding kon niet worden geladen: ' + err);
    };
    img.src = imageDataUrl;
  });
}

// Functie om geschikte afbeeldingen te kiezen uit meerdere gezichtsafbeeldingen
export function selectBestFaceImages(faceResults: any[], minCount = 3) {
  if (faceResults.length < minCount) {
    throw new Error(`Minimaal ${minCount} geldige gezichtsafbeeldingen zijn vereist`);
  }
  
  // Filteer resultaten waar daadwerkelijk een gezicht is gedetecteerd
  const validResults = faceResults.filter(result => result && result.descriptor);
  
  if (validResults.length < minCount) {
    throw new Error(`Minimaal ${minCount} geldige gezichtsafbeeldingen zijn vereist, er zijn er maar ${validResults.length} gevonden`);
  }
  
  // Selecteer de beste resultaten op basis van gezichtsgrootte
  return validResults.sort((a, b) => {
    const areaA = a.boundingBox.width * a.boundingBox.height;
    const areaB = b.boundingBox.width * b.boundingBox.height;
    return areaB - areaA; // Grootste gezichten eerst
  }).slice(0, Math.min(5, validResults.length)); // Maximaal 5 nemen
}

// Functie om een gemiddelde gezichtsdescriptor te berekenen uit meerdere descriptoren
export function computeAverageFaceDescriptor(faceResults: any[]) {
  if (!faceResults.length) return null;
  
  // Extract all descriptors
  const descriptors = faceResults.map(result => result.descriptor);
  
  // Bereken gemiddelde voor iedere dimensie van de descriptor
  const average = new Float32Array(descriptors[0].length);
  
  for (let i = 0; i < average.length; i++) {
    let sum = 0;
    for (let j = 0; j < descriptors.length; j++) {
      sum += descriptors[j][i];
    }
    average[i] = sum / descriptors.length;
  }
  
  return Array.from(average);
}

// Functie om een gezicht te matchen met een database van bekende gezichten
export function matchFaceWithDatabase(
  faceDescriptor: number[], 
  knownFaces: { id: string; descriptor: number[] }[],
  threshold = 0.6
) {
  if (!faceDescriptor || !knownFaces.length) return null;
  
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
  if (confidence >= threshold) {
    return {
      id: bestMatch.id,
      confidence,
      distance: bestDistance
    };
  }
  
  return null;
}

// Functie om alle gezichten in een foto te detecteren en te matchen
export async function detectAndMatchFaces(
  imageElement: HTMLImageElement, 
  knownFaces: { id: string; descriptor: number[] }[],
  threshold = 0.6
) {
  await loadModels();
  
  try {
    // Detecteer alle gezichten in de afbeelding
    const detections = await faceapi.detectAllFaces(imageElement)
      .withFaceLandmarks()
      .withFaceDescriptors();
    
    if (detections.length === 0) {
      return { faces: [] };
    }
    
    // Voor elk gezicht, zoek naar matches
    const matchedFaces = detections.map(detection => {
      const descriptor = Array.from(detection.descriptor);
      const boundingBox = detection.detection.box.toJSON();
      
      // Zoek naar match in database
      const match = matchFaceWithDatabase(descriptor, knownFaces, threshold);
      
      return {
        boundingBox,
        descriptor,
        match
      };
    });
    
    return { faces: matchedFaces };
  } catch (error) {
    console.error('Fout bij de gezichtsdetectie en matching:', error);
    throw new Error('Gezichtsdetectie en matching is mislukt');
  }
}
