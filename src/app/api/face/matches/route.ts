import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    // Controleer authenticatie
    const { authenticated, user } = await verifyAuth(req);
    
    if (!authenticated || !user) {
      return NextResponse.json(
        { success: false, message: 'Niet geautoriseerd' }, 
        { status: 401 }
      );
    }
    
    // Haal alle matches op, met filters mogelijk op basis van user role
    let matches;
    
    if (user.role === 'ADMIN') {
      // Admins kunnen alle matches zien
      matches = await prisma.faceMatch.findMany({
        include: {
          photo: true,
          rower: {
            include: {
              user: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    } else if (user.role === 'PHOTOGRAPHER') {
      // Fotografen kunnen alleen hun eigen foto's matches zien
      const photographer = await prisma.photographer.findUnique({
        where: { userId: user.id }
      });
      
      if (!photographer) {
        return NextResponse.json(
          { success: false, message: 'Fotografenprofiel niet gevonden' }, 
          { status: 404 }
        );
      }
      
      matches = await prisma.faceMatch.findMany({
        where: {
          photo: {
            photographerId: photographer.id
          }
        },
        include: {
          photo: true,
          rower: {
            include: {
              user: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    } else {
      // Roeiers kunnen alleen hun eigen matches zien
      const rower = await prisma.rower.findUnique({
        where: { userId: user.id }
      });
      
      if (!rower) {
        return NextResponse.json(
          { success: false, message: 'Roeiersprofiel niet gevonden' }, 
          { status: 404 }
        );
      }
      
      matches = await prisma.faceMatch.findMany({
        where: {
          rowerId: rower.id
        },
        include: {
          photo: true,
          rower: {
            include: {
              user: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    }
    
    return NextResponse.json({
      success: true,
      matches
    });
  } catch (error) {
    console.error("Error fetching face matches:", error);
    return NextResponse.json(
      { success: false, message: 'Er is een fout opgetreden bij het ophalen van de gezichtsmatches' }, 
      { status: 500 }
    );
  }
}
