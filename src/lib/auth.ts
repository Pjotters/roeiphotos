import { NextRequest } from 'next/server';
import { verify, JwtPayload } from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Interface voor JWT claims met gebruikersgegevens
interface AuthTokenPayload extends JwtPayload {
  id: string;
  email: string;
  role: 'ROWER' | 'PHOTOGRAPHER' | 'ADMIN';
}

// Functie om authenticatie-token uit verzoekheaders te halen
export function getAuthToken(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  return authHeader.split(' ')[1];
}

// Functie om token te verifiëren en gebruiker op te halen
export async function verifyAuth(req: NextRequest) {
  try {
    const token = getAuthToken(req);
    
    if (!token) {
      return { authenticated: false, user: null };
    }
    
    // Verifieer token
    const decoded = verify(
      token, 
      process.env.JWT_SECRET || 'geheim_voor_development'
    ) as AuthTokenPayload;
    
    // Haal gebruiker op uit database
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: {
        rower: true,
        photographer: true,
      },
    });
    
    if (!user) {
      return { authenticated: false, user: null };
    }
    
    return { 
      authenticated: true, 
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        // Voeg profiel gegevens toe afhankelijk van rol
        ...(user.role === 'ROWER' && user.rower ? {
          profile: {
            teamName: user.rower.teamName,
            hasFaceData: !!user.rower.faceData,
          }
        } : {}),
        ...(user.role === 'PHOTOGRAPHER' && user.photographer ? {
          profile: {
            website: user.photographer.website,
            instagram: user.photographer.instagram,
          }
        } : {})
      } 
    };
  } catch (error) {
    console.error('Auth verification error:', error);
    return { authenticated: false, user: null };
  }
}

// Middleware voor het controleren van bepaalde rollen
export function checkRole(user: any, allowedRoles: string | string[]) {
  if (!user) return false;
  
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  return roles.includes(user.role);
}
