"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/FirebaseAuthProvider';
import { getEvent, Race, Heat, subscribeToEventUpdates } from '@/lib/timing/events';

interface EventPageProps {
  params: {
    id: string;
  }
  searchParams?: {
    code?: string;
  }
}

export default function EventPage({ params, searchParams }: EventPageProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<any>(null);
  const [races, setRaces] = useState<Race[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'schedule' | 'results' | 'photos'>('overview');
  const [error, setError] = useState('');
  
  // Identifier kan een ID of een code zijn
  const eventIdentifier = params.id;
  const isCode = searchParams?.code === 'true';
  
  useEffect(() => {
    const fetchEventData = async () => {
      setLoading(true);
      try {
        const result = await getEvent(eventIdentifier, isCode);
        
        if (result.success && result.event) {
          setEvent(result.event);
          
          // Abonneer op real-time updates
          if (result.event.id) {
            const unsubscribe = subscribeToEventUpdates(result.event.id, (data) => {
              if (data?.races) {
                // Convert object to array and add id
                const racesArray = Object.entries(data.races).map(([id, raceData]) => ({
                  id,
                  ...raceData as any
                }));
                setRaces(racesArray);
              }
            });
            
            // Cleanup bij unmount
            return () => {
              unsubscribe();
            };
          }
        } else {
          setError('Evenement niet gevonden.');
        }
      } catch (err) {
        console.error('Error fetching event:', err);
        setError('Er is een fout opgetreden bij het ophalen van het evenement.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchEventData();
  }, [eventIdentifier, isCode]);
  
  // Controleer of gebruiker toegang heeft tot privé-evenement
  const hasAccess = event?.isPublic || (user && event?.organizerId === user.uid);
  
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mx-auto mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4 mx-auto mb-6"></div>
          <div className="h-48 bg-gray-100 rounded mb-6"></div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Fout</h1>
        <p className="mb-4">{error}</p>
        <button
          onClick={() => router.push('/timing')}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Terug naar evenementen
        </button>
      </div>
    );
  }
  
  if (!hasAccess) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Toegang geweigerd</h1>
        <p className="mb-4">Dit is een privé-evenement. Je hebt de evenementcode nodig om toegang te krijgen.</p>
        <button
          onClick={() => router.push('/timing')}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Terug naar evenementen
        </button>
      </div>
    );
  }
  
  const formatDate = (dateString: string | Date) => {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString('nl-NL', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  };
  
  // Functie om datum+tijd om te zetten naar leesbaar formaat
  const formatDateTime = (dateTimeString: string | Date) => {
    const dateTime = typeof dateTimeString === 'string' ? new Date(dateTimeString) : dateTimeString;
    return dateTime.toLocaleString('nl-NL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <button
          onClick={() => router.push('/timing')}
          className="text-blue-600 hover:underline flex items-center"
        >
          &larr; Terug naar evenementen
        </button>
      </div>
      
      {/* Evenement header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <div>
            <h1 className="text-3xl font-bold">{event.name}</h1>
            <p className="text-gray-600">{event.location}</p>
          </div>
          
          {user && event.organizerId === user.uid && (
            <div className="flex gap-2">
              <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                Wedstrijd toevoegen
              </button>
              <button className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700">
                Bewerken
              </button>
            </div>
          )}
        </div>
        
        <div className="flex flex-wrap gap-4 mb-2">
          <div className="bg-gray-100 px-3 py-1 rounded-full text-sm">
            {formatDate(event.startDate)} - {formatDate(event.endDate)}
          </div>
          <div className={`px-3 py-1 rounded-full text-sm ${
            event.isPublic 
              ? 'bg-green-100 text-green-800' 
              : 'bg-gray-100 text-gray-800'
          }`}>
            {event.isPublic ? 'Publiek' : 'Privé'}
          </div>
        </div>
        
        {event.eventCode && (
          <div className="mt-2">
            <span className="text-sm">Evenementcode: </span>
            <span className="font-mono bg-blue-50 px-2 py-1 rounded text-blue-800">
              {event.eventCode}
            </span>
          </div>
        )}
        
        {event.description && (
          <div className="mt-4 bg-gray-50 p-4 rounded-lg">
            <p>{event.description}</p>
          </div>
        )}
      </div>
      
      {/* Tabbladen */}
      <div className="border-b mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Overzicht
          </button>
          <button
            onClick={() => setActiveTab('schedule')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'schedule'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Wedstrijdschema
          </button>
          <button
            onClick={() => setActiveTab('results')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'results'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Uitslagen
          </button>
          <button
            onClick={() => setActiveTab('photos')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'photos'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Foto's
          </button>
        </nav>
      </div>
      
      {/* Tab content */}
      <div className="py-4">
        {activeTab === 'overview' && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Evenement Overzicht</h2>
            
            {/* Samenvattende gegevens */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium mb-2">Wedstrijden</h3>
                <p className="text-2xl font-bold">{races.length}</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium mb-2">Deelnemende clubs</h3>
                <p className="text-2xl font-bold">0</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium mb-2">Status</h3>
                <p className="text-lg">
                  {new Date() < new Date(event.startDate) 
                    ? 'Nog niet begonnen' 
                    : new Date() > new Date(event.endDate)
                      ? 'Afgelopen'
                      : 'Actief'}
                </p>
              </div>
            </div>
            
            {/* Volgende races */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-3">Volgende wedstrijden</h3>
              
              {races.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tijd
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Wedstrijd
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Boottype
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {races.slice(0, 5).map((race) => (
                        <tr key={race.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {race.startTime ? formatDateTime(race.startTime) : 'Geen tijd'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {race.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {race.boatType} - {race.category}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              race.status === 'scheduled' 
                                ? 'bg-yellow-100 text-yellow-800' 
                                : race.status === 'in_progress'
                                  ? 'bg-green-100 text-green-800'
                                  : race.status === 'completed'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-red-100 text-red-800'
                            }`}>
                              {race.status === 'scheduled' 
                                ? 'Gepland' 
                                : race.status === 'in_progress'
                                  ? 'In uitvoering'
                                  : race.status === 'completed'
                                    ? 'Voltooid'
                                    : 'Geannuleerd'}
                            </span>
                          </td>
                        </tr>
                      ))}
                      
                      {races.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                            Geen wedstrijden gepland
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="bg-gray-50 p-8 rounded-lg text-center">
                  <p className="text-gray-600 mb-4">Er zijn nog geen wedstrijden toegevoegd aan dit evenement.</p>
                  
                  {user && event.organizerId === user.uid && (
                    <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                      Voeg eerste wedstrijd toe
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
        
        {activeTab === 'schedule' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Wedstrijdschema</h2>
              
              {user && event.organizerId === user.uid && (
                <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                  Wedstrijd toevoegen
                </button>
              )}
            </div>
            
            {races.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tijd
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Wedstrijd
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Boottype
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Afstand
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acties
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {races.map((race) => (
                      <tr key={race.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {race.startTime ? formatDateTime(race.startTime) : 'Geen tijd'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {race.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {race.boatType} - {race.category}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {race.distance}m
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            race.status === 'scheduled' 
                              ? 'bg-yellow-100 text-yellow-800' 
                              : race.status === 'in_progress'
                                ? 'bg-green-100 text-green-800'
                                : race.status === 'completed'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-red-100 text-red-800'
                          }`}>
                            {race.status === 'scheduled' 
                              ? 'Gepland' 
                              : race.status === 'in_progress'
                                ? 'In uitvoering'
                                : race.status === 'completed'
                                  ? 'Voltooid'
                                  : 'Geannuleerd'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <button className="text-blue-600 hover:underline">Bekijk</button>
                          {user && event.organizerId === user.uid && (
                            <>
                              <span className="mx-1">|</span>
                              <button className="text-gray-600 hover:underline">Bewerk</button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                    
                    {races.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                          Geen wedstrijden gepland
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-gray-50 p-8 rounded-lg text-center">
                <p className="text-gray-600 mb-4">Er zijn nog geen wedstrijden toegevoegd aan dit evenement.</p>
                
                {user && event.organizerId === user.uid && (
                  <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                    Voeg eerste wedstrijd toe
                  </button>
                )}
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'results' && (
          <div>
            <h2 className="text-xl font-semibold mb-6">Uitslagen</h2>
            
            {races.filter(r => r.status === 'completed').length > 0 ? (
              <div className="space-y-8">
                {races
                  .filter(r => r.status === 'completed')
                  .map((race) => (
                    <div key={race.id} className="bg-white rounded-lg shadow overflow-hidden">
                      <div className="bg-gray-50 px-6 py-4 border-b">
                        <h3 className="text-lg font-semibold">{race.name}</h3>
                        <div className="text-sm text-gray-500 mt-1">
                          {race.boatType} - {race.category} - {race.distance}m
                        </div>
                      </div>
                      
                      {/* Hier volgen uitslagen */}
                      <div className="px-6 py-4">
                        <p className="text-gray-600 italic">Klik op een wedstrijd in het schema om de gedetailleerde resultaten te bekijken.</p>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="bg-gray-50 p-8 rounded-lg text-center">
                <p className="text-gray-600">
                  Er zijn nog geen voltooide wedstrijden voor dit evenement.
                </p>
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'photos' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Foto's</h2>
              
              <Link href={`/photos?event=${event.name}`} className="text-blue-600 hover:underline">
                Bekijk alle foto's
              </Link>
            </div>
            
            {/* Foto galerij koppeling */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
              <h3 className="text-lg font-semibold mb-2">Foto's geïntegreerd met RoeiFoto's</h3>
              <p className="mb-4">
                Alle foto's die getagged zijn met dit evenement worden automatisch hier weergegeven.
                Fotografen kunnen foto's uploaden en taggen met dit evenement via de upload pagina.
              </p>
              <div className="flex gap-3">
                <Link 
                  href="/upload" 
                  className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Upload foto's
                </Link>
                <Link 
                  href={`/photos?event=${event.name}`}
                  className="inline-block bg-white text-blue-600 border border-blue-600 px-4 py-2 rounded hover:bg-blue-50"
                >
                  Bekijk foto's
                </Link>
              </div>
            </div>
            
            {/* Fotovoorbeeld */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                <span className="text-gray-400">Geen foto's</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
