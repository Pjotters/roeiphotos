import { auth, db } from './firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  deleteUser,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp, updateDoc, deleteDoc } from 'firebase/firestore';
import { sign } from 'jsonwebtoken';

// Type voor gebruikersrollen
export type UserRole = 'ROWER' | 'PHOTOGRAPHER' | 'ADMIN';

// Type voor gebruikersdata in Firestore
interface UserData {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: any;
  updatedAt: any;
  faceDescriptor?: any;
  dataUseConsent?: boolean;
  gdprConsent?: boolean;
}

// Gebruiker registreren in Firebase Authentication en Firestore
export async function registerUser(
  email: string, 
  password: string, 
  name: string, 
  role: UserRole = 'ROWER'
) {
  try {
    // Maak gebruiker aan in Firebase Authentication
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Sla uitgebreide gebruikersgegevens op in Firestore
    const userData: UserData = {
      id: user.uid,
      email: user.email || email,
      name,
      role,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    // Sla gebruikersgegevens op in Firestore
    await setDoc(doc(db, 'users', user.uid), userData);
    
    // Maak een subprofiel aan voor de gebruiker, afhankelijk van de rol
    if (role === 'ROWER') {
      await setDoc(doc(db, 'rowers', user.uid), {
        userId: user.uid,
        teamName: '',
        faceData: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } else if (role === 'PHOTOGRAPHER') {
      await setDoc(doc(db, 'photographers', user.uid), {
        userId: user.uid,
        bio: '',
        website: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
    
    // Maak een JWT token met gebruikersgegevens
    const token = sign(
      {
        id: user.uid,
        email: user.email,
        role: role
      },
      process.env.JWT_SECRET || 'geheim_voor_development',
      { expiresIn: '7d' }
    );
    
    return { 
      success: true, 
      user: userData, 
      token, 
      error: null 
    };
  } catch (error: any) {
    console.error('Registration error:', error);
    return { 
      success: false, 
      user: null, 
      token: null, 
      error: error.message 
    };
  }
}

// Gebruiker inloggen
export async function loginUser(email: string, password: string) {
  try {
    // Inloggen met Firebase Authentication
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Haal gebruikersgegevens op uit Firestore
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    
    if (!userDoc.exists()) {
      throw new Error('Gebruikersgegevens niet gevonden');
    }
    
    const userData = userDoc.data() as UserData;
    
    // Maak een JWT token met gebruikersgegevens
    const token = sign(
      {
        id: user.uid,
        email: user.email,
        role: userData.role
      },
      process.env.JWT_SECRET || 'geheim_voor_development',
      { expiresIn: '7d' }
    );
    
    return { 
      success: true, 
      user: userData, 
      token, 
      error: null 
    };
  } catch (error: any) {
    console.error('Login error:', error);
    return { 
      success: false, 
      user: null, 
      token: null, 
      error: error.message 
    };
  }
}

// Gebruiker uitloggen
export async function logoutUser() {
  try {
    await signOut(auth);
    return { success: true, error: null };
  } catch (error: any) {
    console.error('Logout error:', error);
    return { success: false, error: error.message };
  }
}

// Huidige gebruiker ophalen
export function getCurrentUser() {
  return new Promise<User | null>((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

// Gebruikersgegevens ophalen uit Firestore
export async function getUserData(userId: string) {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    
    if (!userDoc.exists()) {
      return { success: false, user: null, error: 'Gebruiker niet gevonden' };
    }
    
    const userData = userDoc.data() as UserData;
    
    return { success: true, user: userData, error: null };
  } catch (error: any) {
    console.error('Get user data error:', error);
    return { success: false, user: null, error: error.message };
  }
}

// Controleer of een gebruiker is ingelogd en haal gegevens op
export async function checkAuthState() {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return { authenticated: false, user: null };
    }
    
    const { success, user: userData } = await getUserData(user.uid);
    
    if (!success) {
      return { authenticated: false, user: null };
    }
    
    return { authenticated: true, user: userData };
  } catch (error) {
    console.error('Check auth state error:', error);
    return { authenticated: false, user: null };
  }
}

// Gebruikersprofielgegevens bijwerken
export async function updateUserProfile(profileData: { 
  name?: string;
  dataUseConsent?: boolean;
  gdprConsent?: boolean;
}) {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('Geen ingelogde gebruiker gevonden');
    }

    // Update naam in Firebase Auth als deze is opgegeven
    if (profileData.name) {
      await updateProfile(currentUser, { displayName: profileData.name });
    }

    // Update Firestore gebruikersgegevens
    const userDocRef = doc(db, 'users', currentUser.uid);
    await updateDoc(userDocRef, {
      ...profileData,
      updatedAt: serverTimestamp()
    });

    return { success: true, error: null };
  } catch (error) {
    console.error('Error updating user profile:', error);
    return { success: false, error };
  }
}

// Gebruikersaccount verwijderen
export async function deleteUserAccount() {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('Geen ingelogde gebruiker gevonden');
    }

    // Verwijder eerst Firestore gegevens
    const userDocRef = doc(db, 'users', currentUser.uid);
    await deleteDoc(userDocRef);

    // Verwijder daarna het Firebase Auth account
    await deleteUser(currentUser);

    return { success: true, error: null };
  } catch (error) {
    console.error('Error deleting user account:', error);
    return { success: false, error };
  }
}
