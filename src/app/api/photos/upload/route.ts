import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

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
    
    // Alleen fotografen kunnen foto's uploaden
    if (user.role !== 'PHOTOGRAPHER') {
      return NextResponse.json(
        { success: false, message: 'Alleen fotografen kunnen foto\'s uploaden' }, 
        { status: 403 }
      );
    }

    // Haal de fotograaf op
    const photographer = await prisma.photographer.findUnique({
      where: { userId: user.id }
    });

    if (!photographer) {
      return NextResponse.json(
        { success: false, message: 'Fotografenprofiel niet gevonden' }, 
        { status: 404 }
      );
    }

    const body = await req.json();
    const { 
      photoUrls, 
      thumbnailUrls, 
      eventName, 
      eventDate, 
      isPublic = false 
    } = body;

    if (!photoUrls || !Array.isArray(photoUrls) || photoUrls.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Geen foto\'s aanwezig in verzoek' }, 
        { status: 400 }
      );
    }

    // Maak records aan voor alle foto's
    const photoPromises = photoUrls.map((url, index) => {
      return prisma.photo.create({
        data: {
          photographerId: photographer.id,
          url: url,
          thumbnail: thumbnailUrls ? thumbnailUrls[index] : null,
          eventName: eventName || null,
          eventDate: eventDate ? new Date(eventDate) : null,
          isPublic,
          metadata: {}, // Leeg JSON object voor nu
        }
      });
    });

    const photos = await Promise.all(photoPromises);

    return NextResponse.json({
      success: true,
      message: `${photos.length} foto's succesvol geüpload`,
      photos: photos.map(p => ({
        id: p.id,
        url: p.url,
        thumbnail: p.thumbnail,
        eventName: p.eventName,
        eventDate: p.eventDate,
        isPublic: p.isPublic,
        createdAt: p.createdAt
      }))
    });
  } catch (error) {
    console.error("Photo upload error:", error);
    return NextResponse.json(
      { success: false, message: 'Er is een fout opgetreden bij het uploaden van foto\'s' }, 
      { status: 500 }
    );
  }
}
