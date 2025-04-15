"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import PhotoUploaderFirebase from '@/components/PhotoUploaderFirebase';

export default function UploadPage() {
  const router = useRouter();
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [error, setError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadedPhotos, setUploadedPhotos] = useState<{ path: string; url: string }[]>([]);

  // Handler voor succesvolle upload via de PhotoUploader component
  const handleUploadComplete = (photos: { path: string; url: string }[]) => {
    setUploadedPhotos(photos);
    setUploadSuccess(true);
    
    // Automatisch doorsturen naar het dashboard na 2 seconden
    setTimeout(() => {
      router.push('/dashboard?upload=success');
    }, 2000);
  };
  
  // Handler voor upload fouten
  const handleUploadError = (err: Error) => {
    setError(`Fout bij uploaden: ${err.message}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!eventName) {
      setError('Vul een evenementnaam in.');
      return;
    }

    if (!eventDate) {
      setError('Selecteer een evenementdatum.');
      return;
    }

    setError('');
    
    // De PhotoUploader component handelt de daadwerkelijke upload af
    // We valideren hier alleen de formuliergegevens
    
    // In een volledige implementatie zouden we hier de metadata (eventnaam, datum, etc.) 
    // naar de server sturen om te koppelen aan de geüploade foto's
    
    // Als er al foto's zijn geüpload, kunnen we het formulier direct verwerken
    if (uploadSuccess && uploadedPhotos.length > 0) {
      console.log('Verwerken van foto metadata:', {
        photos: uploadedPhotos,
        eventName,
        eventDate,
        isPublic
      });
      
      router.push('/dashboard?upload=success');
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-900">Foto's uploaden</h1>
        <p className="mt-1 text-sm text-gray-500">
          Upload je roeifoto's en laat ze automatisch matchen met roeiers.
        </p>

        {error && (
          <div className="mt-4 bg-red-50 border-l-4 border-red-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-8">
          {/* Upload component */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Foto's uploaden</h3>
              <PhotoUploaderFirebase 
                eventInfo={{
                  name: eventName,
                  date: eventDate
                }}
                onUploadComplete={handleUploadComplete}
                onUploadError={handleUploadError}
                maxFiles={20}
                isPublic={isPublic}
              />
              
              {uploadSuccess && (
                <div className="mt-4 bg-green-50 border-l-4 border-green-400 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-green-700">
                        {uploadedPhotos.length} foto's succesvol geüpload! Je wordt doorgestuurd naar je dashboard...
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Evenementdetails */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Evenement details</h3>
              <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="event-name" className="block text-sm font-medium text-gray-700">
                    Evenementnaam*
                  </label>
                  <input
                    type="text"
                    name="event-name"
                    id="event-name"
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="bijv. Hollandia Roeiwedstrijden"
                  />
                </div>
                <div>
                  <label htmlFor="event-date" className="block text-sm font-medium text-gray-700">
                    Evenementdatum*
                  </label>
                  <input
                    type="date"
                    name="event-date"
                    id="event-date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
              </div>

              <div className="mt-5">
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="public"
                      name="public"
                      type="checkbox"
                      checked={isPublic}
                      onChange={(e) => setIsPublic(e.target.checked)}
                      className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="public" className="font-medium text-gray-700">
                      Maak foto's publiek toegankelijk
                    </label>
                    <p className="text-gray-500">
                      Publieke foto's zijn zichtbaar voor alle gebruikers van het platform. Niet-publieke foto's zijn alleen zichtbaar voor gematchte roeiers.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Formulier versturen */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!eventName || !eventDate}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              Opslaan en afronden
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
