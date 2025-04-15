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
import { v4 as uuidv4 } from 'uuid';

// Types voor Evenementen
export interface RoeiEvent {
  id?: string;
  name: string;
  location: string;
  startDate: Date | string;
  endDate: Date | string;
  organizer: string;
  organizerId: string;
  description?: string;
  isPublic: boolean;
  eventCode: string; // Unieke code om makkelijk te delen
  createdAt?: any;
  updatedAt?: any;
}

export interface Race {
  id?: string;
  eventId: string;
  name: string;
  boatType: string; // "8+", "4+", "2x", "1x", etc.
  category: string; // "Open", "Licht", "Dames", etc.
  distance: number; // In meters
  startTime: Date | string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  heats?: Heat[];
}

export interface Heat {
  id?: string;
  raceId: string;
  heatNumber: number;
  startTime: Date | string;
  lanes: Lane[];
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
}

export interface Lane {
  laneNumber: number;
  teamId: string;
  teamName: string;
  clubId: string;
  clubName: string;
  startTime?: Date | string;
  finishTime?: Date | string;
  resultTime?: number; // In milliseconds
  status: 'dns' | 'dnf' | 'finished' | 'disqualified' | 'scheduled';
}

// Evenement aanmaken
export async function createEvent(eventData: Omit<RoeiEvent, 'id' | 'eventCode' | 'createdAt' | 'updatedAt'>) {
  try {
    // Genereer unieke event code (6 karakters, letters en cijfers)
    const eventCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    // Voeg data toe aan Firestore voor permanente opslag
    const eventRef = await addDoc(collection(db, 'events'), {
      ...eventData,
      eventCode,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    // Sla ook een referentie op in Realtime Database voor snelle toegang en live updates
    const rtdbRef = ref(rtdb, `events/${eventRef.id}/info`);
    await set(rtdbRef, {
      id: eventRef.id,
      name: eventData.name,
      location: eventData.location,
      startDate: new Date(eventData.startDate).toISOString(),
      endDate: new Date(eventData.endDate).toISOString(),
      isPublic: eventData.isPublic,
      eventCode
    });
    
    return {
      success: true,
      eventId: eventRef.id,
      eventCode
    };
  } catch (error) {
    console.error('Error creating event:', error);
    return {
      success: false,
      error
    };
  }
}

// Evenement ophalen op basis van ID of eventCode
export async function getEvent(eventIdentifier: string, isCode: boolean = false) {
  try {
    let eventDoc;
    
    if (isCode) {
      // Zoek op eventCode
      const eventsQuery = query(
        collection(db, 'events'), 
        where('eventCode', '==', eventIdentifier)
      );
      const querySnapshot = await getDocs(eventsQuery);
      
      if (querySnapshot.empty) {
        return { success: false, error: 'Event not found' };
      }
      
      eventDoc = querySnapshot.docs[0];
    } else {
      // Zoek op ID
      const eventRef = doc(db, 'events', eventIdentifier);
      eventDoc = await getDoc(eventRef);
      
      if (!eventDoc.exists()) {
        return { success: false, error: 'Event not found' };
      }
    }
    
    // Evenement data vormen
    const eventData = eventDoc.data() as RoeiEvent;
    return {
      success: true,
      event: {
        id: eventDoc.id,
        ...eventData
      }
    };
  } catch (error) {
    console.error('Error getting event:', error);
    return {
      success: false,
      error
    };
  }
}

// Races voor een evenement aanmaken
export async function createRace(raceData: Omit<Race, 'id'>) {
  try {
    // Voeg race toe aan Firestore
    const raceRef = await addDoc(collection(db, 'races'), {
      ...raceData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    // Voeg race toe aan Realtime Database voor live updates
    const rtdbRef = ref(rtdb, `events/${raceData.eventId}/races/${raceRef.id}`);
    await set(rtdbRef, {
      id: raceRef.id,
      name: raceData.name,
      boatType: raceData.boatType,
      category: raceData.category,
      distance: raceData.distance,
      startTime: new Date(raceData.startTime).toISOString(),
      status: raceData.status
    });
    
    return {
      success: true,
      raceId: raceRef.id
    };
  } catch (error) {
    console.error('Error creating race:', error);
    return {
      success: false,
      error
    };
  }
}

// Heat voor een race aanmaken
export async function createHeat(heatData: Omit<Heat, 'id'>) {
  try {
    // Haal de race op om het evenementID te krijgen
    const raceRef = doc(db, 'races', heatData.raceId);
    const raceDoc = await getDoc(raceRef);
    
    if (!raceDoc.exists()) {
      return { success: false, error: 'Race not found' };
    }
    
    const raceData = raceDoc.data() as Race;
    
    // Voeg heat toe aan Firestore
    const heatRef = await addDoc(collection(db, 'heats'), {
      ...heatData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    // Voeg heat toe aan Realtime Database voor live updates
    const rtdbRef = ref(rtdb, `events/${raceData.eventId}/races/${heatData.raceId}/heats/${heatRef.id}`);
    await set(rtdbRef, {
      id: heatRef.id,
      heatNumber: heatData.heatNumber,
      startTime: new Date(heatData.startTime).toISOString(),
      status: heatData.status,
      lanes: heatData.lanes
    });
    
    return {
      success: true,
      heatId: heatRef.id
    };
  } catch (error) {
    console.error('Error creating heat:', error);
    return {
      success: false,
      error
    };
  }
}

// Update heat resultaten (tijd registratie)
export async function updateHeatResults(heatId: string, laneUpdates: Partial<Lane>[]) {
  try {
    // Haal heat op
    const heatRef = doc(db, 'heats', heatId);
    const heatDoc = await getDoc(heatRef);
    
    if (!heatDoc.exists()) {
      return { success: false, error: 'Heat not found' };
    }
    
    const heatData = heatDoc.data() as Heat;
    
    // Verkrijg race en event info voor realtime database paden
    const raceRef = doc(db, 'races', heatData.raceId);
    const raceDoc = await getDoc(raceRef);
    
    if (!raceDoc.exists()) {
      return { success: false, error: 'Race not found' };
    }
    
    const raceData = raceDoc.data() as Race;
    
    // Update lanes in heat
    const updatedLanes = [...heatData.lanes];
    
    laneUpdates.forEach(laneUpdate => {
      const laneIndex = updatedLanes.findIndex(
        lane => lane.laneNumber === laneUpdate.laneNumber
      );
      
      if (laneIndex !== -1) {
        updatedLanes[laneIndex] = {
          ...updatedLanes[laneIndex],
          ...laneUpdate
        };
      }
    });
    
    // Update Firestore
    await updateDoc(heatRef, {
      lanes: updatedLanes,
      updatedAt: serverTimestamp()
    });
    
    // Update Realtime Database voor live resultaten
    const rtdbRef = ref(rtdb, `events/${raceData.eventId}/races/${heatData.raceId}/heats/${heatId}`);
    
    // Update alleen de lanes die gewijzigd zijn
    const rtdbUpdates: Record<string, any> = {};
    laneUpdates.forEach(lane => {
      rtdbUpdates[`lanes/${lane.laneNumber - 1}`] = {
        ...updatedLanes.find(l => l.laneNumber === lane.laneNumber)
      };
    });
    
    await update(rtdbRef, rtdbUpdates);
    
    return {
      success: true,
      updatedLanes
    };
  } catch (error) {
    console.error('Error updating heat results:', error);
    return {
      success: false,
      error
    };
  }
}

// Abonneer op live updates voor een evenement
export function subscribeToEventUpdates(eventId: string, callback: (data: any) => void) {
  const eventRef = ref(rtdb, `events/${eventId}`);
  
  const unsubscribe = onValue(eventRef, (snapshot) => {
    const data = snapshot.val();
    callback(data);
  });
  
  return unsubscribe;
}

// Abonneer op live updates voor een race
export function subscribeToRaceUpdates(eventId: string, raceId: string, callback: (data: any) => void) {
  const raceRef = ref(rtdb, `events/${eventId}/races/${raceId}`);
  
  const unsubscribe = onValue(raceRef, (snapshot) => {
    const data = snapshot.val();
    callback(data);
  });
  
  return unsubscribe;
}

// Abonneer op live updates voor een heat (voor realtime resultaten)
export function subscribeToHeatUpdates(eventId: string, raceId: string, heatId: string, callback: (data: any) => void) {
  const heatRef = ref(rtdb, `events/${eventId}/races/${raceId}/heats/${heatId}`);
  
  const unsubscribe = onValue(heatRef, (snapshot) => {
    const data = snapshot.val();
    callback(data);
  });
  
  return unsubscribe;
}
