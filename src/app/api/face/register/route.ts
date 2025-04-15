import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { computeAverageFaceDescriptor, selectBestFaceImages } from '@/lib/faceRecognition';

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
    
    // Alleen roeiers kunnen gezichtsdata registreren
    if (user.role !== 'ROWER') {
      return NextResponse.json(
        { success: false, message: 'Alleen roeiers kunnen gezichtsdata registreren' }, 
        { status: 403 }
      );
    }

    // Haal de roeier op
    const rower = await prisma.rower.findUnique({
      where: { userId: user.id }
    });

    if (!rower) {
      return NextResponse.json(
        { success: false, message: 'Roeiersprofiel niet gevonden' }, 
        { status: 404 }
      );
    }

    const body = await req.json();
    const { faceData } = body;

    if (!faceData || !Array.isArray(faceData) || faceData.length < 3) {
      return NextResponse.json(
        { success: false, message: 'Er zijn minstens 3 gezichtsafbeeldingen vereist' }, 
        { status: 400 }
      );
    }

    try {
      // Selecteer de beste gezichtsafbeeldingen
      const bestFaces = selectBestFaceImages(faceData);
      
      // Bereken een gemiddelde gezichtsdescriptor
      const averageFaceDescriptor = computeAverageFaceDescriptor(bestFaces);
      
      if (!averageFaceDescriptor) {
        return NextResponse.json(
          { success: false, message: 'Kon geen geldig gezichtskenmerk berekenen' }, 
          { status: 400 }
        );
      }
      
      // Sla de gezichtsdata op als JSON string in de database
      await prisma.rower.update({
        where: { id: rower.id },
        data: {
          faceData: JSON.stringify({
            descriptor: averageFaceDescriptor,
            faces: bestFaces.map(face => ({
              descriptor: face.descriptor,
              boundingBox: face.boundingBox
            })),
            updatedAt: new Date().toISOString()
          })
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Gezichtsgegevens succesvol geregistreerd'
      });
    } catch (error: any) {
      return NextResponse.json(
        { success: false, message: error.message || 'Fout bij verwerken van gezichtsgegevens' }, 
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Face registration error:", error);
    return NextResponse.json(
      { success: false, message: 'Er is een fout opgetreden bij het registreren van gezichtsgegevens' }, 
      { status: 500 }
    );
  }
}
