import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { detectAndMatchFaces, processImageForFaceDetection } from '@/lib/faceRecognition';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    // Controleer authenticatie
    const { authenticated, user } = await verifyAuth(req);
    
    if (!authenticated || !user) {
      return NextResponse.json(
        { success: false, message: 'Niet geautoriseerd' }, 
        { status: 401 }
      );
    }
    
    // Alleen fotografen kunnen foto's laten matchen
    if (user.role !== 'PHOTOGRAPHER' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Alleen fotografen kunnen foto\'s laten matchen' }, 
        { status: 403 }
      );
    }

    const body = await req.json();
    const { photoId, photoUrl } = body;

    if (!photoId || !photoUrl) {
      return NextResponse.json(
        { success: false, message: 'Foto-ID en foto-URL zijn vereist' }, 
        { status: 400 }
      );
    }

    // Controleer of de foto bestaat
    const photo = await prisma.photo.findUnique({
      where: { id: photoId },
      include: {
        photographer: true
      }
    });

    if (!photo) {
      return NextResponse.json(
        { success: false, message: 'Foto niet gevonden' }, 
        { status: 404 }
      );
    }

    // Controleer of de fotograaf eigenaar is van de foto
    if (photo.photographer.userId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Je bent niet gemachtigd om deze foto te laten matchen' }, 
        { status: 403 }
      );
    }

    // Haal alle roeiers op met gezichtsdata
    const rowers = await prisma.rower.findMany({
      where: {
        faceData: {
          not: null
        }
      }
    });

    if (rowers.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Geen roeiers met gezichtsdata gevonden om mee te matchen',
        matches: []
      });
    }

    // Transformeer roeier gezichtsdata naar het juiste formaat voor matching
    const knownFaces = rowers
      .filter((rower: any) => rower.faceData)
      .map((rower: any) => {
        try {
          const faceData = JSON.parse(rower.faceData as string);
          return {
            id: rower.id,
            descriptor: faceData.descriptor
          };
        } catch (error) {
          console.error(`Ongeldige gezichtsdata voor roeier ${rower.id}`);
          return null;
        }
      })
      .filter(Boolean);

    // Als er geen geldige gezichtsdata is, stoppen we hier
    if (knownFaces.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Geen geldige gezichtsdata gevonden om mee te matchen',
        matches: []
      });
    }

    try {
      // Verwerk de foto voor gezichtsdetectie en -matching
      // In een echte implementatie zou je hier de foto eerst moeten downloaden of direct verwerken via een canvas
      // Voor nu gaan we ervan uit dat processImageForFaceDetection een URL kan verwerken
      const result = await processImageForFaceDetection(photoUrl);
      
      if (!result || !result.descriptor) {
        return NextResponse.json({
          success: true,
          message: 'Geen gezichten gedetecteerd in de foto',
          matches: []
        });
      }
      
      // Zoek naar matches tussen de gedetecteerde gezichten en bekende roeiers
      const matchResults = [];
      const matchPromises = [];
      
      // We kunnen beter de directe facedetection doen als we het image-element hebben
      // Hier simuleren we een match op basis van de descriptor
      for (const knownFace of knownFaces) {
        // Bereken euclidische afstand tussen descriptoren
        const distance = calculateEuclideanDistance(
          result.descriptor, 
          knownFace.descriptor
        );
        
        // Bereken confidence score (0-1) - hoe lager de afstand, hoe hoger de confidence
        const confidence = Math.max(0, Math.min(1, 1 - distance));
        
        // Als de confidence boven de threshold is, beschouwen we het als een match
        if (confidence >= 0.6) {
          // Haal de bijbehorende roeier op
          const matchPromise = prisma.rower.findUnique({
            where: { id: knownFace.id },
            include: { user: true }
          }).then((matchedRower: any) => {
            if (matchedRower) {
              // Sla de match op in de database
              return prisma.faceMatch.create({
                data: {
                  photoId: photo.id,
                  rowerId: matchedRower.id,
                  confidence: confidence,
                  coordinates: result.boundingBox,
                  approved: false
                }
              }).then((faceMatch: any) => {
                return {
                  matchId: faceMatch.id,
                  rower: {
                    id: matchedRower.id,
                    name: matchedRower.user.name,
                    teamName: matchedRower.teamName
                  },
                  confidence,
                  boundingBox: result.boundingBox
                };
              });
            }
            return null;
          });
          
          matchPromises.push(matchPromise);
        }
      }
      
      // Wacht tot alle matches zijn verwerkt
      const resolvedMatches = await Promise.all(matchPromises);
      const validMatches = resolvedMatches.filter(Boolean);
      
      return NextResponse.json({
        success: true,
        message: `${validMatches.length} roeier(s) herkend in de foto`,
        matches: validMatches
      });
    } catch (error) {
      console.error("Face matching error:", error);
      return NextResponse.json(
        { success: false, message: 'Fout bij het matchen van gezichten' }, 
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Face matching API error:", error);
    return NextResponse.json(
      { success: false, message: 'Er is een fout opgetreden bij het matchen van gezichten' }, 
      { status: 500 }
    );
  }
}

// Helper functie om euclidische afstand te berekenen (als we geen faceapi direct willen aanroepen)
function calculateEuclideanDistance(a: number[], b: number[]) {
  if (a.length !== b.length) {
    throw new Error('Descriptors moeten dezelfde lengte hebben');
  }
  
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  
  return Math.sqrt(sum);
}
