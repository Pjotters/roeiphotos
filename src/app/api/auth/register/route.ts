import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Validatieschema voor gebruikersregistratie
const userSchema = z.object({
  email: z.string().email({ message: "Ongeldig e-mailadres" }),
  password: z.string().min(8, { message: "Wachtwoord moet minimaal 8 tekens lang zijn" }),
  name: z.string().min(2, { message: "Naam moet minimaal 2 tekens lang zijn" }),
  role: z.enum(["ROWER", "PHOTOGRAPHER"]),
  // Optionele velden voor roeiers
  teamName: z.string().optional(),
  // Optionele velden voor fotografen
  website: z.string().url({ message: "Ongeldige website URL" }).optional().or(z.literal('')),
  instagram: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Valideer de invoer
    const validationResult = userSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          errors: validationResult.error.errors 
        }, 
        { status: 400 }
      );
    }
    
    const { email, password, name, role, teamName, website, instagram } = validationResult.data;

    // Controleer of gebruiker al bestaat
    const existingUser = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Er bestaat al een gebruiker met dit e-mailadres" 
        }, 
        { status: 409 }
      );
    }

    // Hash het wachtwoord
    const hashedPassword = await hash(password, 10);

    // Maak een nieuwe gebruiker aan
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role,
      },
    });

    // Maak bijbehorend profiel aan afhankelijk van de rol
    if (role === 'ROWER') {
      await prisma.rower.create({
        data: {
          userId: user.id,
          teamName,
        },
      });
    } else if (role === 'PHOTOGRAPHER') {
      await prisma.photographer.create({
        data: {
          userId: user.id,
          website,
          instagram,
        },
      });
    }

    // Gebruikersgegevens terugsturen (zonder wachtwoord)
    return NextResponse.json(
      { 
        success: true, 
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          createdAt: user.createdAt,
        } 
      }, 
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Er is een fout opgetreden bij het registreren" 
      }, 
      { status: 500 }
    );
  }
}
