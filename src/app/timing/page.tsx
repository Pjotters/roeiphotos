"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/FirebaseAuthProvider';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Tijdelijk type voor evenementen totdat we de echte import gebruiken
interface RoeiEvent {
  id: string;
  name: string;
  location: string;
  startDate: any;
  endDate: any;
  eventCode: string;
  isPublic: boolean;
}

export default function TimingPage() {
  const { user, userData } = useAuth();
  const [events, setEvents] = useState<RoeiEvent[]>([]);
  const [publicEvents, setPublicEvents] = useState<RoeiEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventCode, setEventCode] = useState('');
  
  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        // Haal publieke evenementen op
        const publicEventsQuery = query(
          collection(db, 'events'),
          where('isPublic', '==', true),
          orderBy('startDate', 'desc')
        );
        
        const publicSnapshot = await getDocs(publicEventsQuery);
        const publicEventsList: RoeiEvent[] = [];
        
        publicSnapshot.forEach((doc) => {
          const data = doc.data();
          publicEventsList.push({
            id: doc.id,
            name: data.name,
            location: data.location,
            startDate: data.startDate ? new Date(data.startDate.seconds * 1000) : new Date(),
            endDate: data.endDate ? new Date(data.endDate.seconds * 1000) : new Date(),
            eventCode: data.eventCode,
            isPublic: data.isPublic
          });
        });
        
        setPublicEvents(publicEventsList);
        
        // Haal eigen evenementen op als gebruiker is ingelogd
        if (user) {
          const userEventsQuery = query(
            collection(db, 'events'),
            where('organizerId', '==', user.uid),
            orderBy('startDate', 'desc')
          );
          
          const userSnapshot = await getDocs(userEventsQuery);
          const userEventsList: RoeiEvent[] = [];
          
          userSnapshot.forEach((doc) => {
            const data = doc.data();
            userEventsList.push({
              id: doc.id,
              name: data.name,
              location: data.location,
              startDate: data.startDate ? new Date(data.startDate.seconds * 1000) : new Date(),
              endDate: data.endDate ? new Date(data.endDate.seconds * 1000) : new Date(),
              eventCode: data.eventCode,
              isPublic: data.isPublic
            });
          });
          
          setEvents(userEventsList);
        }
      } catch (error) {
        console.error("Error fetching events:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchEvents();
  }, [user]);
  
  const handleJoinEvent = () => {
    if (eventCode) {
      // Navigeer naar het event met de code
      window.location.href = `/timing/events?code=${eventCode}`;
    }
  };
  
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('nl-NL', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">RoeiTiming - Wedstrijdmanagement</h1>
      
      {/* Event joining sectie */}
      <div className="bg-blue-50 p-4 rounded-lg mb-8">
        <h2 className="text-xl font-semibold mb-3">Doe mee met een evenement</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={eventCode}
            onChange={(e) => setEventCode(e.target.value.toUpperCase())}
            placeholder="Voer evenementcode in"
            className="px-4 py-2 border rounded flex-grow"
            maxLength={6}
          />
          <button
            onClick={handleJoinEvent}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Ga naar evenement
          </button>
        </div>
      </div>
      
      {/* Mijn evenementen sectie - alleen als ingelogd */}
      {user && (
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold">Mijn Evenementen</h2>
            <Link 
              href="/timing/events/new" 
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              Nieuw Evenement
            </Link>
          </div>
          
          {loading ? (
            <p>Evenementen laden...</p>
          ) : events.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {events.map((event) => (
                <Link 
                  href={`/timing/events/${event.id}`}
                  key={event.id}
                  className="block"
                >
                  <div className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                    <div className="p-4">
                      <div className="flex justify-between items-start">
                        <h3 className="text-lg font-semibold">{event.name}</h3>
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          Code: {event.eventCode}
                        </span>
                      </div>
                      <p className="text-gray-600">{event.location}</p>
                      <p className="text-sm mt-2">
                        {formatDate(event.startDate)} - {formatDate(event.endDate)}
                      </p>
                      <div className="mt-3 flex justify-between items-center">
                        <span className={`px-2 py-1 rounded text-xs ${
                          event.isPublic 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {event.isPublic ? 'Publiek' : 'Privé'}
                        </span>
                        <button className="text-blue-600 hover:underline text-sm">
                          Beheren
                        </button>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="bg-gray-50 p-6 rounded-lg text-center">
              <p className="mb-4">Je hebt nog geen evenementen aangemaakt.</p>
              <Link 
                href="/timing/events/new"
                className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Maak je eerste evenement aan
              </Link>
            </div>
          )}
        </div>
      )}
      
      {/* Publieke evenementen sectie */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Publieke Evenementen</h2>
        
        {loading ? (
          <p>Evenementen laden...</p>
        ) : publicEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {publicEvents.map((event) => (
              <Link 
                href={`/timing/events/${event.id}`}
                key={event.id}
                className="block"
              >
                <div className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                  <div className="p-4">
                    <h3 className="text-lg font-semibold">{event.name}</h3>
                    <p className="text-gray-600">{event.location}</p>
                    <p className="text-sm mt-2">
                      {formatDate(event.startDate)} - {formatDate(event.endDate)}
                    </p>
                    <div className="mt-3">
                      <button className="text-blue-600 hover:underline text-sm">
                        Bekijk schema en resultaten
                      </button>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p>Geen publieke evenementen gevonden.</p>
        )}
      </div>
    </div>
  );
}
