import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { loginUser } from '@/lib/auth-firebase';

// Geen Prisma client nodig met Firebase

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

    // Inloggen met Firebase
    const result = await loginUser(email, password);

    // Controleer of inloggen gelukt is
    if (!result.success) {
      return NextResponse.json(
        { 
          success: false, 
          message: result.error || "Ongeldige inloggegevens" 
        }, 
        { status: 401 }
      );
    }

    // Gebruikersgegevens en token terugsturen
    return NextResponse.json({
      success: true,
      user: result.user,
      token: result.token
    });
  } catch (error: any) {
    console.error("Login error:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || "Er is een fout opgetreden bij het inloggen" 
      }, 
      { status: 500 }
    );
  }
}
