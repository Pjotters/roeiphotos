import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { registerUser } from '@/lib/auth-firebase';

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

    // Registreer gebruiker met Firebase
    const result = await registerUser(email, password, name, role);

    if (!result.success) {
      // Firebase geeft specifieke foutmeldingen terug die we kunnen controleren
      if (result.error && result.error.includes('email-already-in-use')) {
        return NextResponse.json(
          { 
            success: false, 
            message: "Er bestaat al een gebruiker met dit e-mailadres" 
          }, 
          { status: 409 }
        );
      }
      
      return NextResponse.json(
        { 
          success: false, 
          message: result.error || 'Registratie mislukt' 
        }, 
        { status: 400 }
      );
    }

    // Update extra profielgegevens in Firebase (zoals teamNaam voor roeiers)
    // Dit is nu al geïmplementeerd in registerUser functie, dus niets extra nodig hier

    // Gebruikersgegevens en token terugsturen
    return NextResponse.json(
      { 
        success: true, 
        user: result.user,
        token: result.token
      }, 
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || "Er is een fout opgetreden bij het registreren" 
      }, 
      { status: 500 }
    );
  }
}
