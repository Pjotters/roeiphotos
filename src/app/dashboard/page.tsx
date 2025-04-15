"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/FirebaseAuthProvider';
import { getPhotos, getPhotoStatistics } from '@/lib/storage-firebase';
// Importeer de juiste interface voor face matches params
interface FaceMatchParams {
  photoId?: string;
  rowerId?: string;
  photographerId?: string;
  approved?: boolean;
}
import { getFaceMatches } from '@/lib/face-recognition-firebase';

type UserRole = 'ROWER' | 'PHOTOGRAPHER' | 'ADMIN';

export default function Dashboard() {
  const router = useRouter();
  const { user, userData, loading: authLoading } = useAuth();
  const [photoStats, setPhotoStats] = useState<any>(null);
  const [faceMatches, setFaceMatches] = useState<any[]>([]);
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Redirect naar login als de gebruiker niet is ingelogd
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  // Haal relevante data op gebaseerd op de gebruikersrol
  useEffect(() => {
    if (!userData) return;

    const fetchData = async () => {
      try {
        if (userData.role === 'PHOTOGRAPHER') {
          // Haal fotografendata op
          const stats = await getPhotoStatistics(user?.uid || '');
          const photosResult = await getPhotos(user?.uid || '', 5);
          setPhotoStats(stats);
          
          // Zorg voor correcte afhandeling van het resultaat van getPhotos
          if (Array.isArray(photosResult)) {
            // Direct array behandelen (nieuwe implementatie)
            setPhotos(photosResult);
          } else if (photosResult.success && Array.isArray(photosResult.photos)) {
            // Object met success en photos velden (oude implementatie)
            setPhotos(photosResult.photos);
          } else {
            // Fallback naar lege array
            setPhotos([]);
          }
        } else if (userData.role === 'ROWER') {
          // Haal roeiersdata op
          try {
            const params: FaceMatchParams = {
              rowerId: user?.uid || ''
            };
            const matchesResult = await getFaceMatches(params);
            if (matchesResult && matchesResult.success) {
              setFaceMatches(matchesResult.matches || []);
            } else {
              setFaceMatches([]);
            }
          } catch (matchError) {
            console.error('Error fetching face matches:', matchError);
            setFaceMatches([]);
          }
        }
        setLoading(false);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setLoading(false);
      }
    };

    if (userData) {
      fetchData();
    }
  }, [userData, user]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Dashboard wordt geladen...</p>
        </div>
      </div>
    );
  }
  
  // Als er geen gebruiker is, toon dan niets (de redirect zal plaatsvinden)
  if (!userData) {
    return null;
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Welkomstbanner */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-8">
          <div className="px-4 py-5 sm:p-6">
            <h1 className="text-2xl font-bold text-gray-900">
              Welkom {userData.name} bij je RoeiFoto's Dashboard
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {userData.role === 'ROWER' ? 
                'Bekijk hier je matches, foto\'s en instellingen als roeier.' : 
                'Beheer hier je geüploade foto\'s en instellingen als fotograaf.'}
            </p>
          </div>
        </div>

        {/* Dashboard inhoud op basis van rol */}
        {userData.role === 'ROWER' && (
          <RowerDashboard faceMatches={faceMatches} userId={user?.uid || ''} />
        )}
        {userData.role === 'PHOTOGRAPHER' && (
          <PhotographerDashboard photos={photos} stats={photoStats} userId={user?.uid || ''} />
        )}
        {userData.role === 'ADMIN' && (
          <AdminDashboard />
        )}
      </div>
    </div>
  );
}

function RowerDashboard({ faceMatches, userId }: { faceMatches: any[], userId: string }) {
  // Dummy data voor het dashboard van roeiers
  const recentMatches = [
    { id: '1', eventName: 'Hollandia Roeiwedstrijden', date: '12 apr 2025', matches: 8 },
    { id: '2', eventName: 'NSRF Slotwedstrijden', date: '5 apr 2025', matches: 3 },
    { id: '3', eventName: 'Heineken Roeivierkamp', date: '25 mrt 2025', matches: 12 },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Gezichtsmatch sectie */}
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg font-medium leading-6 text-gray-900">Recente Matches</h3>
          <p className="mt-1 text-sm text-gray-500">
            Foto's waar je recent op bent geïdentificeerd
          </p>
        </div>
        <div className="bg-gray-50 px-4 py-5 sm:p-6">
          {recentMatches.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {recentMatches.map((match) => (
                <li key={match.id} className="py-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="bg-blue-100 h-10 w-10 rounded-full flex items-center justify-center">
                        <span className="text-blue-800 font-medium">{match.matches}</span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {match.eventName}
                      </p>
                      <p className="text-sm text-gray-500 truncate">{match.date}</p>
                    </div>
                    <div>
                      <Link
                        href={`/photos?event=${match.id}`}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-full shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Bekijken
                      </Link>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-4">
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
              <h3 className="mt-2 text-sm font-medium text-gray-900">Geen matches</h3>
              <p className="mt-1 text-sm text-gray-500">
                Er zijn nog geen foto's waar je op herkend bent.
              </p>
            </div>
          )}
        </div>
        <div className="bg-white px-4 py-4 sm:px-6 border-t border-gray-200">
          <Link
            href="/photos/matches"
            className="text-sm font-medium text-blue-600 hover:text-blue-500"
          >
            Bekijk alle matches <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      </div>

      {/* Instellingen en Profiel sectie */}
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg font-medium leading-6 text-gray-900">Jouw Profiel</h3>
          <p className="mt-1 text-sm text-gray-500">
            Beheer je profiel en gezichtsherkenning instellingen
          </p>
        </div>
        <div className="px-4 py-5 sm:p-6">
          <div className="space-y-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="bg-gray-200 h-16 w-16 rounded-full flex items-center justify-center">
                  <svg className="h-8 w-8 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <h4 className="text-lg font-medium text-gray-900">Profielgegevens</h4>
                <p className="text-sm text-gray-500">Wijzig je profiel en accountgegevens</p>
              </div>
              <div className="ml-auto">
                <Link
                  href="/profile"
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Bewerken
                </Link>
              </div>
            </div>

            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="bg-gray-200 h-16 w-16 rounded-full flex items-center justify-center">
                  <svg className="h-8 w-8 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <h4 className="text-lg font-medium text-gray-900">Gezichtsherkenning</h4>
                <p className="text-sm text-gray-500">Verbeter je gezichtsherkenning</p>
              </div>
              <div className="ml-auto">
                <Link
                  href="/profile/face-setup"
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Bewerken
                </Link>
              </div>
            </div>

            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="bg-gray-200 h-16 w-16 rounded-full flex items-center justify-center">
                  <svg className="h-8 w-8 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <h4 className="text-lg font-medium text-gray-900">Privacy Instellingen</h4>
                <p className="text-sm text-gray-500">Beheer jouw privacy voorkeuren</p>
              </div>
              <div className="ml-auto">
                <Link
                  href="/profile/privacy"
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Bewerken
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PhotographerDashboard({ photos, stats, userId }: { photos: any[], stats: any, userId: string }) {
  // Dummy data voor het dashboard van fotografen
  const recentUploads = [
    { id: '1', eventName: 'Hollandia Roeiwedstrijden', date: '12 apr 2025', photos: 124, views: 356 },
    { id: '2', eventName: 'NSRF Slotwedstrijden', date: '5 apr 2025', photos: 89, views: 210 },
    { id: '3', eventName: 'Heineken Roeivierkamp', date: '25 mrt 2025', photos: 212, views: 567 },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Geüploade foto's sectie */}
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg font-medium leading-6 text-gray-900">Recente Uploads</h3>
          <p className="mt-1 text-sm text-gray-500">
            Je meest recente foto-uploads
          </p>
        </div>
        <div className="bg-gray-50 px-4 py-5 sm:p-6">
          {recentUploads.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {recentUploads.map((upload) => (
                <li key={upload.id} className="py-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="bg-blue-100 h-10 w-10 rounded-full flex items-center justify-center">
                        <span className="text-blue-800 font-medium">{upload.photos}</span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {upload.eventName}
                      </p>
                      <p className="text-sm text-gray-500 truncate">{upload.date} • {upload.views} views</p>
                    </div>
                    <div>
                      <Link
                        href={`/photos/manage/${upload.id}`}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-full shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Beheren
                      </Link>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-4">
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
              <h3 className="mt-2 text-sm font-medium text-gray-900">Geen uploads</h3>
              <p className="mt-1 text-sm text-gray-500">
                Je hebt nog geen foto's geüpload.
              </p>
            </div>
          )}
        </div>
        <div className="bg-white px-4 py-4 sm:px-6 border-t border-gray-200">
          <div className="flex justify-between">
            <Link
              href="/photos/manage"
              className="text-sm font-medium text-blue-600 hover:text-blue-500"
            >
              Beheer alle uploads <span aria-hidden="true">&rarr;</span>
            </Link>

            <Link
              href="/upload"
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Nieuwe upload
            </Link>
          </div>
        </div>
      </div>

      {/* Statistieken en informatie sectie */}
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg font-medium leading-6 text-gray-900">Statistieken</h3>
          <p className="mt-1 text-sm text-gray-500">
            Inzicht in hoe je foto's presteren
          </p>
        </div>
        <div className="px-4 py-5 sm:p-6">
          <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="bg-gray-50 overflow-hidden rounded-lg px-4 py-5 sm:p-6">
              <dt className="text-sm font-medium text-gray-500 truncate">Totaal aantal foto's</dt>
              <dd className="mt-1 text-3xl font-semibold text-gray-900">425</dd>
            </div>

            <div className="bg-gray-50 overflow-hidden rounded-lg px-4 py-5 sm:p-6">
              <dt className="text-sm font-medium text-gray-500 truncate">Totaal aantal views</dt>
              <dd className="mt-1 text-3xl font-semibold text-gray-900">1,133</dd>
            </div>

            <div className="bg-gray-50 overflow-hidden rounded-lg px-4 py-5 sm:p-6">
              <dt className="text-sm font-medium text-gray-500 truncate">Herkende gezichten</dt>
              <dd className="mt-1 text-3xl font-semibold text-gray-900">231</dd>
            </div>

            <div className="bg-gray-50 overflow-hidden rounded-lg px-4 py-5 sm:p-6">
              <dt className="text-sm font-medium text-gray-500 truncate">Gemiddelde views per foto</dt>
              <dd className="mt-1 text-3xl font-semibold text-gray-900">2.6</dd>
            </div>
          </dl>
        </div>
        <div className="bg-white px-4 py-4 sm:px-6 border-t border-gray-200">
          <Link
            href="/profile/photographer"
            className="text-sm font-medium text-blue-600 hover:text-blue-500"
          >
            Bewerk je fotografenprofiel <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

function AdminDashboard() {
  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg font-medium leading-6 text-gray-900">Admin Dashboard</h3>
        <p className="mt-2 max-w-xl text-sm text-gray-500">
          Als administrator heb je toegang tot beheerdersfuncties.
        </p>
        <div className="mt-5">
          <Link
            href="/admin"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Ga naar Admin Panel
          </Link>
        </div>
      </div>
    </div>
  );
}
