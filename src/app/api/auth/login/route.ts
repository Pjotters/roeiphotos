import { NextRequest, NextResponse } from 'next/server';
import { compare } from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { sign } from 'jsonwebtoken';
import { z } from 'zod';

const prisma = new PrismaClient();

// Validatieschema voor login
const loginSchema = z.object({
  email: z.string().email({ message: "Ongeldig e-mailadres" }),
  password: z.string().min(1, { message: "Wachtwoord is verplicht" }),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Valideer de invoer
    const validationResult = loginSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          errors: validationResult.error.errors 
        }, 
        { status: 400 }
      );
    }
    
    const { email, password } = validationResult.data;

    // Zoek gebruiker op basis van e-mail
    const user = await prisma.user.findUnique({
      where: {
        email,
      },
      include: {
        rower: true,
        photographer: true,
      },
    });

    // Controleer of gebruiker bestaat
    if (!user) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Ongeldige inloggegevens" 
        }, 
        { status: 401 }
      );
    }

    // Controleer wachtwoord
    const passwordValid = await compare(password, user.password);
    
    if (!passwordValid) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Ongeldige inloggegevens" 
        }, 
        { status: 401 }
      );
    }

    // Genereer JWT token
    // Normaal zou je hiervoor een echte geheime sleutel uit je environment variables halen
    const token = sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET || 'geheim_voor_development',
      { expiresIn: '7d' }
    );

    // Bepaal profielgegevens op basis van rol
    let profileData = null;
    if (user.role === 'ROWER' && user.rower) {
      profileData = {
        teamName: user.rower.teamName,
        hasFaceData: !!user.rower.faceData,
      };
    } else if (user.role === 'PHOTOGRAPHER' && user.photographer) {
      profileData = {
        website: user.photographer.website,
        instagram: user.photographer.instagram,
      };
    }

    // Gebruikersgegevens terugsturen (zonder wachtwoord)
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        profile: profileData,
      },
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Er is een fout opgetreden bij het inloggen" 
      }, 
      { status: 500 }
    );
  }
}
