import { NextRequest, NextResponse } from 'next/server';
import { checkAuthState } from '@/lib/auth-firebase';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';

export async function POST(req: NextRequest) {
  try {
    // Controleer authenticatie met Firebase
    const { authenticated, user } = await checkAuthState();
    
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

    // Haal de fotograaf op uit Firestore
    const photographerQuery = query(
      collection(db, 'photographers'), 
      where('userId', '==', user.id)
    );
    const photographerSnapshot = await getDocs(photographerQuery);
    
    if (photographerSnapshot.empty) {
      return NextResponse.json(
        { success: false, message: 'Fotografenprofiel niet gevonden' }, 
        { status: 404 }
      );
    }
    
    const photographerId = photographerSnapshot.docs[0].id;

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

    // Maak records aan voor alle foto's in Firestore
    const photoPromises = photoUrls.map((url, index) => {
      const photoData = {
        photographerId,
        url: url,
        thumbnailUrl: thumbnailUrls ? thumbnailUrls[index] : null,
        eventName: eventName || null,
        eventDate: eventDate ? new Date(eventDate) : null,
        isPublic,
        metadata: {}, // Leeg JSON object voor nu
        createdAt: new Date(),
        faceMatches: 0,
      };
      
      return addDoc(collection(db, 'photos'), photoData);
    });

    const photoRefs = await Promise.all(photoPromises);
    
    // Maak een array van foto's met hun ID's
    const photos = photoRefs.map((ref, index) => ({
      id: ref.id,
      url: photoUrls[index],
      thumbnailUrl: thumbnailUrls ? thumbnailUrls[index] : null,
      eventName: eventName || null,
      eventDate: eventDate ? new Date(eventDate) : null,
      isPublic,
      createdAt: new Date()
    }));

    return NextResponse.json({
      success: true,
      message: `${photos.length} foto's succesvol geüpload`,
      photos: photos.map(p => ({
        id: p.id,
        url: p.url,
        thumbnail: p.thumbnailUrl,
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
