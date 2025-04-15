"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';

// Type voor een foto-item
interface Photo {
  id: string;
  url: string;
  thumbnailUrl: string;
  eventName: string;
  eventDate: string;
  photographerName: string;
  isMatch?: boolean;
}

export default function PhotosPage() {
  const searchParams = useSearchParams();
  const eventFilter = searchParams.get('event');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'matches'>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Dit is een tijdelijke simulatie van het ophalen van foto's
  useEffect(() => {
    // Simuleer API-call om foto's op te halen
    setTimeout(() => {
      // Dummy data voor foto's
      const dummyPhotos: Photo[] = Array.from({ length: 20 }, (_, i) => ({
        id: `photo-${i + 1}`,
        url: `/api/photos/placeholder-${(i % 5) + 1}`,
        thumbnailUrl: `/api/photos/placeholder-${(i % 5) + 1}`,
        eventName: ['Hollandia Roeiwedstrijden', 'NSRF Slotwedstrijden', 'Heineken Roeivierkamp'][i % 3],
        eventDate: ['12 apr 2025', '5 apr 2025', '25 mrt 2025'][i % 3],
        photographerName: ['Jan Jansen', 'Piet Fotograaf', 'Anne Kiekjes'][i % 3],
        isMatch: i % 3 === 0 // Elke derde foto is een match voor demo doeleinden
      }));

      // Als er een eventFilter is, filter de foto's
      if (eventFilter) {
        const filtered = dummyPhotos.filter(photo => 
          photo.eventName.toLowerCase().includes(eventFilter.toLowerCase())
        );
        setPhotos(filtered);
      } else {
        setPhotos(dummyPhotos);
      }
      
      setLoading(false);
    }, 1000);
  }, [eventFilter]);

  // Filter foto's op basis van de actieve filter
  const filteredPhotos = activeFilter === 'matches' 
    ? photos.filter(photo => photo.isMatch) 
    : photos;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Foto's worden geladen...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Titel en filters */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {eventFilter 
                  ? `Foto's van ${photos[0]?.eventName || 'evenement'}` 
                  : 'Alle roeifoto\'s'}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {filteredPhotos.length} foto's gevonden
              </p>
            </div>
            <div className="mt-4 md:mt-0 flex space-x-3">
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="-ml-0.5 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                Filters
              </button>
              <div className="flex rounded-md shadow-sm">
                <button
                  type="button"
                  onClick={() => setActiveFilter('all')}
                  className={`relative inline-flex items-center px-4 py-2 rounded-l-md border border-gray-300 text-sm font-medium ${
                    activeFilter === 'all'
                      ? 'bg-blue-50 text-blue-700 z-10 border-blue-500'
                      : 'bg-white text-gray-700'
                  }`}
                >
                  Alle foto's
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter('matches')}
                  className={`relative inline-flex items-center px-4 py-2 -ml-px rounded-r-md border border-gray-300 text-sm font-medium ${
                    activeFilter === 'matches'
                      ? 'bg-blue-50 text-blue-700 z-10 border-blue-500'
                      : 'bg-white text-gray-700'
                  }`}
                >
                  Mijn matches
                </button>
              </div>
            </div>
          </div>

          {/* Uitklapbare filters */}
          {showFilters && (
            <div className="mt-4 bg-white p-4 rounded-md shadow-sm border border-gray-200">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label htmlFor="event" className="block text-sm font-medium text-gray-700">
                    Evenement
                  </label>
                  <select
                    id="event"
                    name="event"
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  >
                    <option value="">Alle evenementen</option>
                    <option value="Hollandia">Hollandia Roeiwedstrijden</option>
                    <option value="NSRF">NSRF Slotwedstrijden</option>
                    <option value="Heineken">Heineken Roeivierkamp</option>
                  </select>
                </div>
                
                <div>
                  <label htmlFor="date" className="block text-sm font-medium text-gray-700">
                    Datum
                  </label>
                  <select
                    id="date"
                    name="date"
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  >
                    <option value="">Alle datums</option>
                    <option value="recent">Laatste maand</option>
                    <option value="2025-04">April 2025</option>
                    <option value="2025-03">Maart 2025</option>
                  </select>
                </div>
                
                <div>
                  <label htmlFor="photographer" className="block text-sm font-medium text-gray-700">
                    Fotograaf
                  </label>
                  <select
                    id="photographer"
                    name="photographer"
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  >
                    <option value="">Alle fotografen</option>
                    <option value="jan">Jan Jansen</option>
                    <option value="piet">Piet Fotograaf</option>
                    <option value="anne">Anne Kiekjes</option>
                  </select>
                </div>
              </div>
              
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Filters toepassen
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Fotogalerij */}
        {filteredPhotos.length > 0 ? (
          <div className="grid grid-cols-1 gap-y-10 gap-x-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 xl:gap-x-8">
            {filteredPhotos.map((photo) => (
              <div key={photo.id} className="group relative">
                <div className="aspect-w-3 aspect-h-2 rounded-lg overflow-hidden bg-gray-100 shadow-md hover:shadow-lg transition-shadow duration-300 ease-in-out">
                  {/* Placeholder voor echte afbeeldingen */}
                  <div className="w-full h-0 pt-[66.666%] relative">
                    <div className="absolute inset-0 bg-gray-200 flex flex-col items-center justify-center">
                      <svg className="h-12 w-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="mt-2 text-xs text-gray-500">Roeiafbeelding {photo.id}</span>
                    </div>
                  </div>
                  
                  {/* Match badge */}
                  {photo.isMatch && (
                    <div className="absolute top-2 right-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        <svg className="-ml-0.5 mr-1.5 h-2 w-2 text-blue-400" fill="currentColor" viewBox="0 0 8 8">
                          <circle cx="4" cy="4" r="3" />
                        </svg>
                        Match
                      </span>
                    </div>
                  )}
                </div>
                <div className="mt-4">
                  <h3 className="text-sm text-gray-700 font-medium">{photo.eventName}</h3>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{photo.eventDate}</span>
                    <span>Foto: {photo.photographerName}</span>
                  </div>
                  <Link
                    href={`/photos/${photo.id}`}
                    className="mt-2 block text-sm font-medium text-blue-600 hover:text-blue-500"
                  >
                    Bekijk foto
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Geen foto's gevonden</h3>
            <p className="mt-1 text-sm text-gray-500">
              Er zijn geen foto's die voldoen aan je huidige filtercriteria.
            </p>
          </div>
        )}

        {/* Paginering */}
        {filteredPhotos.length > 0 && (
          <div className="mt-12 flex justify-center">
            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
              <a
                href="#"
                className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
              >
                <span className="sr-only">Vorige</span>
                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </a>
              <a
                href="#"
                aria-current="page"
                className="z-10 bg-blue-50 border-blue-500 text-blue-600 relative inline-flex items-center px-4 py-2 border text-sm font-medium"
              >
                1
              </a>
              <a
                href="#"
                className="bg-white border-gray-300 text-gray-500 hover:bg-gray-50 relative inline-flex items-center px-4 py-2 border text-sm font-medium"
              >
                2
              </a>
              <a
                href="#"
                className="bg-white border-gray-300 text-gray-500 hover:bg-gray-50 hidden md:inline-flex relative items-center px-4 py-2 border text-sm font-medium"
              >
                3
              </a>
              <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                ...
              </span>
              <a
                href="#"
                className="bg-white border-gray-300 text-gray-500 hover:bg-gray-50 relative inline-flex items-center px-4 py-2 border text-sm font-medium"
              >
                8
              </a>
              <a
                href="#"
                className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
              >
                <span className="sr-only">Volgende</span>
                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </a>
            </nav>
          </div>
        )}
      </div>
    </div>
  );
}
