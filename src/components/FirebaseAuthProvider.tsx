'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  userData: any | null;
  loading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  loading: true,
  error: null
});

export const useAuth = () => useContext(AuthContext);

export default function FirebaseAuthProvider({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      try {
        setLoading(true);

        if (authUser) {
          setUser(authUser);
          
          // Haal uitgebreide gebruikersgegevens op uit Firestore
          try {
            const userDoc = await fetch(`/api/auth/user?uid=${authUser.uid}`);
            const userData = await userDoc.json();
            
            if (userData.success) {
              setUserData(userData.user);
            } else {
              console.error("Gebruikersgegevens konden niet worden opgehaald:", userData.error);
              setError("Kan gebruikersgegevens niet laden. Probeer opnieuw in te loggen.");
            }
          } catch (err) {
            console.error("Fout bij laden gebruikersgegevens:", err);
            setError("Fout bij het laden van gebruikersgegevens");
          }
        } else {
          setUser(null);
          setUserData(null);
        }
      } catch (err) {
        console.error("Auth state error:", err);
        setError("Er is een authenticatiefout opgetreden");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, userData, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
}
