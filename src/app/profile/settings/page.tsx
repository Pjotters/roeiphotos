"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/FirebaseAuthProvider';
import { updateUserProfile, deleteUserAccount } from '@/lib/auth-firebase';

export default function SettingsPage() {
  const router = useRouter();
  const { user, userData, loading } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [dataUseConsent, setDataUseConsent] = useState(false);
  const [gdprConsent, setGdprConsent] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [updateError, setUpdateError] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [loadingForm, setLoadingForm] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Als de authstate geladen is en er is geen user, redirect naar login
    if (!loading && !user) {
      router.push('/auth/login');
    } else if (userData) {
      setName(userData.name || '');
      setEmail(userData.email || '');
      setDataUseConsent(userData.dataUseConsent || false);
      setGdprConsent(userData.gdprConsent || false);
      setLoadingForm(false);
    }
  }, [user, loading, router, userData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setUpdateSuccess(false);
    setUpdateError('');

    try {
      await updateUserProfile({
        name,
        dataUseConsent,
        gdprConsent,
      });
      setUpdateSuccess(true);
      setTimeout(() => {
        setUpdateSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
      setUpdateError('Er is een fout opgetreden bij het bijwerken van je profiel.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== userData?.email) {
      setUpdateError('Voer je e-mailadres correct in om je account te verwijderen.');
      return;
    }

    setSubmitting(true);
    try {
      await deleteUserAccount();
      router.push('/');
    } catch (error) {
      console.error('Error deleting account:', error);
      setUpdateError('Er is een fout opgetreden bij het verwijderen van je account.');
      setSubmitting(false);
    }
  };

  if (loading || loadingForm) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white shadow rounded-lg p-8">
            <p className="text-center text-gray-500">Instellingen laden...</p>
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
            <h1 className="text-2xl font-bold text-gray-900">Instellingen</h1>
            <p className="text-sm text-gray-500 mt-1">
              Beheer je accountinstellingen en privacy
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {updateSuccess && (
              <div className="rounded-md bg-green-50 p-4">
                <div className="flex">
                  <div className="ml-3">
                    <p className="text-sm font-medium text-green-800">
                      Je instellingen zijn succesvol bijgewerkt!
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {updateError && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="flex">
                  <div className="ml-3">
                    <p className="text-sm font-medium text-red-800">
                      {updateError}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <h3 className="text-lg font-medium text-gray-900">Profielgegevens</h3>
              <div className="mt-3 grid grid-cols-1 gap-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Naam
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      name="name"
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    E-mail
                  </label>
                  <div className="mt-1">
                    <input
                      type="email"
                      name="email"
                      id="email"
                      value={email}
                      disabled
                      className="block w-full rounded-md border-gray-300 bg-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                    <p className="mt-1 text-xs text-gray-500">E-mailadres kan niet worden gewijzigd</p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900">Privacy en gegevensbeheer</h3>
              <p className="text-sm text-gray-500 mt-1">
                In overeenstemming met de AVG/GDPR hebben we je toestemming nodig voor het gebruik van je gegevens
              </p>
              
              <div className="mt-3 space-y-4">
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="dataUseConsent"
                      name="dataUseConsent"
                      type="checkbox"
                      checked={dataUseConsent}
                      onChange={(e) => setDataUseConsent(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="dataUseConsent" className="font-medium text-gray-700">
                      Toestemming gegevensgebruik
                    </label>
                    <p className="text-gray-500">
                      Ik geef toestemming voor het gebruik van mijn gegevens voor het matchen van foto's en het verbeteren van de dienstverlening van RoeiFoto's.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="gdprConsent"
                      name="gdprConsent"
                      type="checkbox"
                      checked={gdprConsent}
                      onChange={(e) => setGdprConsent(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="gdprConsent" className="font-medium text-gray-700">
                      GDPR/AVG toestemming
                    </label>
                    <p className="text-gray-500">
                      Ik bevestig dat ik de <Link href="/privacy-policy" className="text-blue-600 hover:text-blue-500">privacyverklaring</Link> heb gelezen en begrepen, en geef toestemming voor de verwerking van mijn gegevens zoals beschreven.
                    </p>
                  </div>
                </div>

                <div className="pt-4">
                  <p className="text-sm text-gray-500">
                    RoeiFoto's bewaart je gegevens zolang je account actief is. Je kunt op elk moment je gegevens opvragen of verwijderen door contact op te nemen via <a href="mailto:info@roeiphotos.nl" className="text-blue-600 hover:text-blue-500">info@roeiphotos.nl</a>.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-5 flex justify-between">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {submitting ? 'Opslaan...' : 'Instellingen opslaan'}
              </button>
              <Link
                href="/profile"
                className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Terug naar profiel
              </Link>
            </div>
          </form>

          <div className="mt-10 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Account verwijderen</h3>
            <p className="text-sm text-gray-500 mt-1">
              Je account permanent verwijderen. Let op: deze actie kan niet ongedaan worden gemaakt!
            </p>
            
            {!showDeleteConfirm ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="mt-3 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Account verwijderen
              </button>
            ) : (
              <div className="mt-3 p-4 border border-red-300 rounded-md bg-red-50">
                <p className="text-sm text-red-700 font-medium">
                  Voer je e-mailadres in om te bevestigen dat je je account wilt verwijderen:
                </p>
                <div className="mt-2">
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="Voer je e-mail in ter bevestiging"
                    className="block w-full rounded-md border-red-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm"
                  />
                </div>
                <div className="mt-3 flex space-x-3">
                  <button
                    type="button"
                    onClick={handleDeleteAccount}
                    disabled={submitting}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                  >
                    {submitting ? 'Bezig...' : 'Definitief verwijderen'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Annuleren
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
