"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/FirebaseAuthProvider';

export default function ProfilePage() {
  const router = useRouter();
  const { user, userData, loading } = useAuth();
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    // Als de authstate geladen is en er is geen user, redirect naar login
    if (!loading && !user) {
      router.push('/auth/login');
    } else if (userData) {
      setLoadingProfile(false);
    }
  }, [user, loading, router, userData]);

  if (loading || loadingProfile) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white shadow rounded-lg p-8">
            <p className="text-center text-gray-500">Profiel laden...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg p-8">
          <div className="border-b border-gray-200 pb-4 mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Mijn Profiel</h1>
            <p className="text-sm text-gray-500 mt-1">
              Bekijk en beheer je profielgegevens
            </p>
          </div>
          
          <div className="flex items-center mb-8">
            <div className="h-20 w-20 rounded-full bg-blue-100 flex items-center justify-center text-2xl font-bold text-blue-600">
              {userData?.name?.charAt(0) || 'U'}
            </div>
            <div className="ml-6">
              <h2 className="text-xl font-semibold text-gray-900">{userData?.name}</h2>
              <p className="text-gray-500">{userData?.email}</p>
              <p className="text-sm font-medium text-blue-600 mt-1">
                {userData?.role === 'PHOTOGRAPHER' ? 'Fotograaf' : 'Roeier'}
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Accountgegevens</h3>
              <div className="mt-3 grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Naam</dt>
                  <dd className="mt-1 text-sm text-gray-900">{userData?.name}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">E-mail</dt>
                  <dd className="mt-1 text-sm text-gray-900">{userData?.email}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Account type</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {userData?.role === 'PHOTOGRAPHER' ? 'Fotograaf' : 'Roeier'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Lid sinds</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {userData?.createdAt 
                      ? new Date(userData.createdAt.seconds * 1000).toLocaleDateString('nl-NL') 
                      : 'Onbekend'}
                  </dd>
                </div>
              </div>
            </div>

            {userData?.role === 'ROWER' && (
              <div>
                <h3 className="text-lg font-medium text-gray-900">Gezichtsherkenning</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Met gezichtsherkenning kun je automatisch worden getagd op foto's.
                </p>
                <div className="mt-3">
                  <Link 
                    href="/profile/face-setup"
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    {userData?.faceDescriptor ? 'Gezichtsherkenning bijwerken' : 'Gezichtsherkenning instellen'}
                  </Link>
                </div>
              </div>
            )}

            {userData?.role === 'PHOTOGRAPHER' && (
              <div>
                <h3 className="text-lg font-medium text-gray-900">Foto's</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Beheer je geüploade foto's en statistieken.
                </p>
                <div className="mt-3">
                  <Link 
                    href="/dashboard"
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Naar fotobeheer
                  </Link>
                </div>
              </div>
            )}

            <div className="flex pt-4 border-t border-gray-200">
              <Link 
                href="/profile/settings"
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Instellingen
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
