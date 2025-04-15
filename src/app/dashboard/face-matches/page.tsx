"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import FaceRecognitionCanvas from '@/components/FaceRecognitionCanvas';

interface Match {
  id: string;
  photoId: string;
  rowerId: string;
  confidence: number;
  approved: boolean;
  coordinates: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  photo: {
    id: string;
    url: string;
    eventName: string;
    createdAt: string;
  };
  rower: {
    id: string;
    userId: string;
    teamName: string;
    user: {
      id: string;
      name: string;
      email: string;
    };
  };
}

export default function FaceMatchesPage() {
  const router = useRouter();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [groupedByPhoto, setGroupedByPhoto] = useState<{[photoId: string]: Match[]}>({});
  const [currentPhotoId, setCurrentPhotoId] = useState<string | null>(null);
  
  // Laad alle gezichtsmatches
  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const response = await fetch('/api/face/matches');
        const data = await response.json();
        
        if (data.success) {
          setMatches(data.matches);
          
          // Groepeer de matches per foto
          const grouped = data.matches.reduce((acc: {[photoId: string]: Match[]}, match: Match) => {
            if (!acc[match.photoId]) {
              acc[match.photoId] = [];
            }
            acc[match.photoId].push(match);
            return acc;
          }, {});
          
          setGroupedByPhoto(grouped);
          
          // Stel de huidige foto in als er matches zijn
          if (data.matches.length > 0) {
            setCurrentPhotoId(data.matches[0].photoId);
          }
        } else {
          setError(data.message || 'Er ging iets mis bij het ophalen van de matches');
        }
      } catch (err) {
        console.error('Fout bij het ophalen van de matches:', err);
        setError('Er is een fout opgetreden bij het ophalen van de matches');
      } finally {
        setLoading(false);
      }
    };
    
    fetchMatches();
  }, []);
  
  // Keur een match goed of af
  const handleApproveMatch = async (matchId: string, approved: boolean) => {
    try {
      const response = await fetch(`/api/face/matches/${matchId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ approved }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Update lokale staat
        setMatches(prevMatches => 
          prevMatches.map(match => 
            match.id === matchId 
              ? { ...match, approved } 
              : match
          )
        );
        
        // Update gegroepeerde matches ook
        setGroupedByPhoto(prevGrouped => {
          const newGrouped = { ...prevGrouped };
          
          Object.keys(newGrouped).forEach(photoId => {
            newGrouped[photoId] = newGrouped[photoId].map(match => 
              match.id === matchId
                ? { ...match, approved }
                : match
            );
          });
          
          return newGrouped;
        });
      } else {
        setError(data.message || 'Er ging iets mis bij het bijwerken van de match');
      }
    } catch (err) {
      console.error('Fout bij het bijwerken van de match:', err);
      setError('Er is een fout opgetreden bij het bijwerken van de match');
    }
  };
  
  // Verwijder een match
  const handleDeleteMatch = async (matchId: string) => {
    if (!confirm('Weet je zeker dat je deze match wilt verwijderen?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/face/matches/${matchId}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Verwijder match uit lokale staat
        setMatches(prevMatches => prevMatches.filter(match => match.id !== matchId));
        
        // Verwijder match uit gegroepeerde matches
        setGroupedByPhoto(prevGrouped => {
          const newGrouped = { ...prevGrouped };
          
          Object.keys(newGrouped).forEach(photoId => {
            newGrouped[photoId] = newGrouped[photoId].filter(match => match.id !== matchId);
            
            // Als er geen matches meer zijn voor deze foto, verwijder de foto
            if (newGrouped[photoId].length === 0) {
              delete newGrouped[photoId];
              
              // Als dit de huidige foto was, selecteer een andere
              if (photoId === currentPhotoId) {
                const nextPhotoId = Object.keys(newGrouped)[0] || null;
                setCurrentPhotoId(nextPhotoId);
              }
            }
          });
          
          return newGrouped;
        });
      } else {
        setError(data.message || 'Er ging iets mis bij het verwijderen van de match');
      }
    } catch (err) {
      console.error('Fout bij het verwijderen van de match:', err);
      setError('Er is een fout opgetreden bij het verwijderen van de match');
    }
  };
  
  // Bereid de gezichtsboxen voor voor FaceRecognitionCanvas
  const prepareFacesForCanvas = () => {
    if (!currentPhotoId || !groupedByPhoto[currentPhotoId]) {
      return [];
    }
    
    return groupedByPhoto[currentPhotoId].map(match => ({
      id: match.id,
      boundingBox: match.coordinates,
      rower: {
        id: match.rower.id,
        name: match.rower.user.name,
        teamName: match.rower.teamName,
      },
      confidence: match.confidence,
      matchId: match.id,
    }));
  };
  
  // Bereid de huidige foto URL voor
  const getCurrentPhotoUrl = () => {
    if (!currentPhotoId || !groupedByPhoto[currentPhotoId] || groupedByPhoto[currentPhotoId].length === 0) {
      return '';
    }
    
    return groupedByPhoto[currentPhotoId][0].photo.url;
  };
  
  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Gezichtsmatches</h1>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Gezichtsmatches</h1>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
          <strong className="font-bold">Fout!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      </div>
    );
  }
  
  if (matches.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Gezichtsmatches</h1>
        <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded relative">
          <span className="block sm:inline">Er zijn nog geen gezichtsmatches beschikbaar.</span>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Gezichtsmatches</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lijst met foto's */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <h2 className="p-4 bg-blue-600 text-white font-semibold">Foto's met matches</h2>
          <div className="divide-y">
            {Object.keys(groupedByPhoto).map(photoId => {
              const matches = groupedByPhoto[photoId];
              const photo = matches[0].photo;
              
              return (
                <div
                  key={photoId}
                  className={`p-4 cursor-pointer hover:bg-gray-100 ${
                    currentPhotoId === photoId ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => setCurrentPhotoId(photoId)}
                >
                  <h3 className="font-semibold">{photo.eventName || 'Onbekend evenement'}</h3>
                  <p className="text-sm text-gray-600">{new Date(photo.createdAt).toLocaleDateString()}</p>
                  <div className="flex justify-between items-center mt-2">
                    <p className="text-sm text-blue-600">{matches.length} gezichtsmatches</p>
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span className="text-xs text-gray-600">
                        {matches.filter(m => m.approved).length} goedgekeurd
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Huidige foto met gezichtsmatches */}
        <div className="bg-white rounded-lg shadow overflow-hidden lg:col-span-2">
          {currentPhotoId && groupedByPhoto[currentPhotoId] ? (
            <div>
              <div className="p-4 bg-blue-600 text-white">
                <h2 className="font-semibold">
                  {groupedByPhoto[currentPhotoId][0].photo.eventName || 'Onbekend evenement'}
                </h2>
                <p className="text-sm">
                  {new Date(groupedByPhoto[currentPhotoId][0].photo.createdAt).toLocaleString()}
                </p>
              </div>
              
              <div className="p-4">
                <FaceRecognitionCanvas
                  imageUrl={getCurrentPhotoUrl()}
                  faces={prepareFacesForCanvas()}
                  interactive={true}
                  showLabels={true}
                />
              </div>
              
              <div className="p-4 border-t">
                <h3 className="font-semibold mb-2">Matches op deze foto</h3>
                <div className="space-y-4">
                  {groupedByPhoto[currentPhotoId].map(match => (
                    <div key={match.id} className={`p-3 rounded-lg ${
                      match.approved 
                        ? 'bg-green-50 border border-green-200' 
                        : 'bg-yellow-50 border border-yellow-200'
                    }`}>
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-semibold">{match.rower.user.name}</h4>
                          <p className="text-sm text-gray-600">{match.rower.teamName}</p>
                          <p className="text-sm">
                            <span className="font-medium">Betrouwbaarheid:</span> {Math.round(match.confidence * 100)}%
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          {/* Status en acties */}
                          {match.approved ? (
                            <>
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Goedgekeurd
                              </span>
                              <button
                                onClick={() => handleApproveMatch(match.id, false)}
                                className="text-sm text-red-600 hover:text-red-800"
                              >
                                Afkeuren
                              </button>
                            </>
                          ) : (
                            <>
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                Wachtend
                              </span>
                              <button
                                onClick={() => handleApproveMatch(match.id, true)}
                                className="text-sm text-green-600 hover:text-green-800"
                              >
                                Goedkeuren
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleDeleteMatch(match.id)}
                            className="text-sm text-gray-600 hover:text-gray-800"
                          >
                            Verwijderen
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center">
              <p className="text-gray-600">Selecteer een foto om de gezichtsmatches te bekijken</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
