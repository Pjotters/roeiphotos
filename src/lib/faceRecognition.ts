import * as faceapi from 'face-api.js';

// Pad naar de model bestanden - zorg voor absolute URL op basis van de huidige host
const MODEL_URL = typeof window !== 'undefined' ? `${window.location.origin}/models` : '/models';

// Flag om bij te houden of de modellen al geladen zijn
let modelsLoaded = false;
let loadingPromise: Promise<void> | null = null;

// Functie om alle benodigde modellen te laden
export async function loadModels() {
  // Als reeds geladen, return direct
  if (modelsLoaded) return;
  
  // Als al bezig met laden, gebruik dezelfde Promise
  if (loadingPromise) return loadingPromise;
  
  // Maak een nieuwe laadpromise aan
  loadingPromise = new Promise<void>(async (resolve, reject) => {
    try {
      console.log(`Loading face-api models from: ${MODEL_URL}`);
      
      // Laad modellen één voor één om problemen te voorkomen
      await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
      console.log('✓ SSD MobileNet model loaded');
      
      await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
      console.log('✓ Face Landmark model loaded');
      
      await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
      console.log('✓ Face Recognition model loaded');
      
      await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL);
      console.log('✓ Face Expression model loaded');
      
      modelsLoaded = true;
      console.log('✅ Alle face-api modellen succesvol geladen');
      resolve();
    } catch (error) {
      console.error('❌ Fout bij het laden van face-api modellen:', error);
      loadingPromise = null; // Reset de promise zodat een volgende poging kan worden gedaan
      reject(new Error('Gezichtsherkenningsmodellen konden niet worden geladen'));
    }
  });
  
  return loadingPromise;
}

// Functie om een gezicht te detecteren en descriptoren te extraheren uit een afbeelding
export async function detectFace(imageElement: HTMLImageElement) {
  try {
    // Zorg ervoor dat de modellen geladen zijn voordat we verder gaan
    await loadModels();
    
    // Controleer of de afbeelding correct is geladen
    if (!imageElement || !imageElement.complete || !imageElement.naturalHeight) {
      console.warn('Afbeelding is niet volledig geladen voor gezichtsdetectie');
      return new Promise((resolve) => {
        imageElement.onload = async () => {
          try {
            const result = await detectFaceInternal(imageElement);
            resolve(result);
          } catch (error) {
            console.error('Fout bij detectie na laden:', error);
            resolve(null);
          }
        };
      });
    }
    
    return await detectFaceInternal(imageElement);
  } catch (error) {
    console.error('Fout bij gezichtsdetectie:', error);
    return null;
  }
}

// Interne functie voor gezichtsdetectie nadat we gecontroleerd hebben of alles correct is
async function detectFaceInternal(imageElement: HTMLImageElement) {
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
    
    // Converteer Box object naar een eigen JSON structuur
    const boxToObject = (box: faceapi.Box) => ({
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height
    });

    return {
      descriptor: Array.from(detections[0].descriptor),
      boundingBox: boxToObject(detections[0].detection.box),
      landmarks: detections[0].landmarks.positions.map(p => ({ x: p.x, y: p.y })),
      allDetections: detections.map(d => ({
        descriptor: Array.from(d.descriptor),
        boundingBox: boxToObject(d.detection.box)
      }))
    };
  } catch (error) {
    console.error('Fout bij de gezichtsdetectie:', error);
    throw new Error('Gezichtsdetectie is mislukt');
  }
}

// Functie om een afbeelding als dataURL te verwerken voor gezichtsdetectie
export async function processImageForFaceDetection(imageDataUrl: string): Promise<any> {
  try {
    // Zorg ervoor dat de modellen al geladen worden terwijl de afbeelding wordt geladen
    const modelPromise = loadModels();
    
    // Promise voor het laden van de afbeelding
    const imagePromise = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous'; // Help met CORS-problemen
      
      img.onload = () => resolve(img);
      
      img.onerror = (err) => {
        console.error('Afbeelding laad fout:', err);
        reject(new Error('Afbeelding kon niet worden geladen'));
      };
      
      // Start het laden van de afbeelding
      img.src = imageDataUrl;
    });
    
    // Wacht tot zowel modellen als afbeelding zijn geladen
    await modelPromise;
    const img = await imagePromise;
    
    // Verwerk de afbeelding voor gezichtsdetectie
    return await detectFace(img);
  } catch (error) {
    console.error('Fout bij het verwerken van gezichtsafbeelding:', error);
    throw error;
  }
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
  if (confidence >= threshold && bestMatch) {
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
    
    // Converteer Box object naar een eigen JSON structuur
    const boxToObject = (box: faceapi.Box) => ({
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height
    });

    // Voor elk gezicht, zoek naar matches
    const matchedFaces = detections.map(detection => {
      const descriptor = Array.from(detection.descriptor);
      const boundingBox = boxToObject(detection.detection.box);
      
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
