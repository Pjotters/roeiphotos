"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/FirebaseAuthProvider';
import { createEvent } from '@/lib/timing/events';

export default function NewEventPage() {
  const router = useRouter();
  const { user, userData } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');
  
  const [eventData, setEventData] = useState({
    name: '',
    location: '',
    startDate: '',
    endDate: '',
    description: '',
    isPublic: true
  });
  
  // Redirect niet-ingelogde gebruikers
  if (!user) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Toegang geweigerd</h1>
        <p>Je moet ingelogd zijn om een nieuw evenement aan te maken.</p>
        <button
          onClick={() => router.push('/login')}
          className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Inloggen
        </button>
      </div>
    );
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFormError('');
    
    try {
      // Valideer
      if (!eventData.name || !eventData.location || !eventData.startDate || !eventData.endDate) {
        setFormError('Vul alle verplichte velden in.');
        setLoading(false);
        return;
      }
      
      // Controleer datum
      const startDate = new Date(eventData.startDate);
      const endDate = new Date(eventData.endDate);
      
      if (endDate < startDate) {
        setFormError('De einddatum moet na de startdatum liggen.');
        setLoading(false);
        return;
      }
      
      // Maak evenement aan
      const result = await createEvent({
        name: eventData.name,
        location: eventData.location,
        startDate: startDate,
        endDate: endDate,
        description: eventData.description,
        organizer: userData?.name || user.displayName || 'Onbekend',
        organizerId: user.uid,
        isPublic: eventData.isPublic
      });
      
      if (result.success) {
        // Navigeer naar het nieuwe evenement
        router.push(`/timing/events/${result.eventId}`);
      } else {
        throw new Error(result.error ? result.error.toString() : 'Kon het evenement niet aanmaken');
      }
    } catch (error) {
      console.error('Error creating event:', error);
      setFormError('Er is een fout opgetreden bij het aanmaken van het evenement.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    // Handle checkbox special case
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setEventData(prev => ({
        ...prev,
        [name]: checked
      }));
    } else {
      setEventData(prev => ({
        ...prev,
        [name]: value
      }));
    }
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
      
      <h1 className="text-3xl font-bold mb-6">Nieuw Evenement Aanmaken</h1>
      
      {formError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {formError}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow-md">
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">
            Evenementnaam *
          </label>
          <input
            id="name"
            name="name"
            type="text"
            value={eventData.name}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            placeholder="Bijv. Hollandia Roeiwedstrijden 2025"
            required
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="location">
            Locatie *
          </label>
          <input
            id="location"
            name="location"
            type="text"
            value={eventData.location}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            placeholder="Bijv. Bosbaan, Amsterdam"
            required
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="startDate">
              Startdatum *
            </label>
            <input
              id="startDate"
              name="startDate"
              type="date"
              value={eventData.startDate}
              onChange={handleChange}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            />
          </div>
          
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="endDate">
              Einddatum *
            </label>
            <input
              id="endDate"
              name="endDate"
              type="date"
              value={eventData.endDate}
              onChange={handleChange}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            />
          </div>
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="description">
            Beschrijving
          </label>
          <textarea
            id="description"
            name="description"
            value={eventData.description}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            rows={4}
            placeholder="Voeg details toe over het evenement..."
          />
        </div>
        
        <div className="mb-6">
          <label className="flex items-center">
            <input
              type="checkbox"
              name="isPublic"
              checked={eventData.isPublic}
              onChange={(e) => setEventData(prev => ({...prev, isPublic: e.target.checked}))}
              className="mr-2"
            />
            <span className="text-gray-700">Maak dit evenement publiek zichtbaar</span>
          </label>
          <p className="text-gray-500 text-xs mt-1">
            Publieke evenementen zijn zichtbaar voor iedereen. Bij privé-evenementen is de evenementcode nodig.
          </p>
        </div>
        
        <div className="flex items-center justify-between">
          <button
            type="submit"
            disabled={loading}
            className={`bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${
              loading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {loading ? 'Aanmaken...' : 'Evenement Aanmaken'}
          </button>
          
          <button
            type="button"
            onClick={() => router.push('/timing')}
            className="text-gray-600 hover:underline"
          >
            Annuleren
          </button>
        </div>
      </form>
    </div>
  );
}
