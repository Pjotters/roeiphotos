import { getDatabase } from 'firebase/database';
import { app } from '../firebase';

// Initialiseer de Realtime Database en voeg toe aan de exports
export const rtdb = getDatabase(app);
