import { db, rtdb } from '../firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where,
  serverTimestamp,
  deleteDoc
} from 'firebase/firestore';
import {
  ref,
  set,
  onValue,
  push,
  update,
  remove
} from 'firebase/database';

// Types voor clubs en teams
export interface Club {
  id?: string;
  name: string;
  shortName: string;
  city: string;
  country: string;
  logo?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface Rower {
  id?: string;
  userId?: string; // Optioneel, kan gekoppeld zijn aan een gebruiker
  firstName: string;
  lastName: string;
  clubId: string;
  clubName?: string;
  gender: 'M' | 'V' | 'X';
  birthYear: number;
  weight?: number; // Relevant voor lichte roeiers
  createdAt?: any;
  updatedAt?: any;
}

export interface Team {
  id?: string;
  name: string;
  clubId: string;
  clubName?: string;
  boatType: string; // "8+", "4+", "2x", "1x", etc.
  category: string; // "Open", "Licht", "Dames", etc.
  rowers: Rower[];
  coxswain?: Rower;
  createdAt?: any;
  updatedAt?: any;
}

// Club aanmaken
export async function createClub(clubData: Omit<Club, 'id' | 'createdAt' | 'updatedAt'>) {
  try {
    // Voeg club toe aan Firestore
    const clubRef = await addDoc(collection(db, 'clubs'), {
      ...clubData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    // Voeg basic info toe aan Realtime Database voor snelle zoekopdrachten
    const rtdbRef = ref(rtdb, `clubs/${clubRef.id}`);
    await set(rtdbRef, {
      id: clubRef.id,
      name: clubData.name,
      shortName: clubData.shortName,
      city: clubData.city,
      country: clubData.country
    });
    
    return {
      success: true,
      clubId: clubRef.id
    };
  } catch (error) {
    console.error('Error creating club:', error);
    return {
      success: false,
      error
    };
  }
}

// Club ophalen
export async function getClub(clubId: string) {
  try {
    const clubRef = doc(db, 'clubs', clubId);
    const clubDoc = await getDoc(clubRef);
    
    if (!clubDoc.exists()) {
      return { success: false, error: 'Club not found' };
    }
    
    const clubData = clubDoc.data() as Club;
    return {
      success: true,
      club: {
        id: clubDoc.id,
        ...clubData
      }
    };
  } catch (error) {
    console.error('Error getting club:', error);
    return {
      success: false,
      error
    };
  }
}

// Alle clubs ophalen
export async function getAllClubs() {
  try {
    const clubsQuery = query(collection(db, 'clubs'));
    const querySnapshot = await getDocs(clubsQuery);
    
    const clubs: Club[] = [];
    querySnapshot.forEach((doc) => {
      const clubData = doc.data() as Club;
      clubs.push({
        id: doc.id,
        ...clubData
      });
    });
    
    return {
      success: true,
      clubs
    };
  } catch (error) {
    console.error('Error getting clubs:', error);
    return {
      success: false,
      error
    };
  }
}

// Roeier aanmaken
export async function createRower(rowerData: Omit<Rower, 'id' | 'createdAt' | 'updatedAt'>) {
  try {
    // Haal clubnaam op als deze niet is meegegeven
    if (!rowerData.clubName && rowerData.clubId) {
      const clubResult = await getClub(rowerData.clubId);
      if (clubResult.success) {
        rowerData.clubName = clubResult.club.name;
      }
    }
    
    // Voeg roeier toe aan Firestore
    const rowerRef = await addDoc(collection(db, 'rowers'), {
      ...rowerData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return {
      success: true,
      rowerId: rowerRef.id
    };
  } catch (error) {
    console.error('Error creating rower:', error);
    return {
      success: false,
      error
    };
  }
}

// Team aanmaken
export async function createTeam(teamData: Omit<Team, 'id' | 'createdAt' | 'updatedAt'>) {
  try {
    // Haal clubnaam op als deze niet is meegegeven
    if (!teamData.clubName && teamData.clubId) {
      const clubResult = await getClub(teamData.clubId);
      if (clubResult.success) {
        teamData.clubName = clubResult.club.name;
      }
    }
    
    // Voeg team toe aan Firestore
    const teamRef = await addDoc(collection(db, 'teams'), {
      ...teamData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    // Voeg basic info toe aan Realtime Database
    const rtdbRef = ref(rtdb, `teams/${teamRef.id}`);
    await set(rtdbRef, {
      id: teamRef.id,
      name: teamData.name,
      clubId: teamData.clubId,
      clubName: teamData.clubName,
      boatType: teamData.boatType,
      category: teamData.category
    });
    
    return {
      success: true,
      teamId: teamRef.id
    };
  } catch (error) {
    console.error('Error creating team:', error);
    return {
      success: false,
      error
    };
  }
}

// Teams van een club ophalen
export async function getTeamsByClub(clubId: string) {
  try {
    const teamsQuery = query(
      collection(db, 'teams'), 
      where('clubId', '==', clubId)
    );
    
    const querySnapshot = await getDocs(teamsQuery);
    
    const teams: Team[] = [];
    querySnapshot.forEach((doc) => {
      const teamData = doc.data() as Team;
      teams.push({
        id: doc.id,
        ...teamData
      });
    });
    
    return {
      success: true,
      teams
    };
  } catch (error) {
    console.error('Error getting teams by club:', error);
    return {
      success: false,
      error
    };
  }
}

// Roeiers van een club ophalen
export async function getRowersByClub(clubId: string) {
  try {
    const rowersQuery = query(
      collection(db, 'rowers'), 
      where('clubId', '==', clubId)
    );
    
    const querySnapshot = await getDocs(rowersQuery);
    
    const rowers: Rower[] = [];
    querySnapshot.forEach((doc) => {
      const rowerData = doc.data() as Rower;
      rowers.push({
        id: doc.id,
        ...rowerData
      });
    });
    
    return {
      success: true,
      rowers
    };
  } catch (error) {
    console.error('Error getting rowers by club:', error);
    return {
      success: false,
      error
    };
  }
}
