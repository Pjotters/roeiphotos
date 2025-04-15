"use client";

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import * as faceapi from 'face-api.js';
import { processImageForFaceDetection } from '@/lib/faceRecognition';

export default function FaceSetupPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const [faceDetectionResults, setFaceDetectionResults] = useState<any[]>([]);
  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState<'intro' | 'capture' | 'processing' | 'complete'>('intro');
  const [error, setError] = useState('');
  const [modelLoaded, setModelLoaded] = useState(false);

  // Laad face-api modellen
  useEffect(() => {
    const loadFaceApiModels = async () => {
      try {
        const MODEL_URL = '/models';
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
        ]);
        
        setModelLoaded(true);
        console.log('Face-api modellen succesvol geladen');
      } catch (error) {
        console.error('Fout bij het laden van face-api modellen:', error);
        setError('Gezichtsherkenningsmodellen konden niet worden geladen. Probeer de pagina te verversen.');
      }
    };

    loadFaceApiModels();
  }, []);

  // Start camera stream
  const startCamera = async () => {
    if (!modelLoaded) {
      setError('Wacht tot de gezichtsherkenningsmodellen zijn geladen');
      return;
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user" 
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      setCameraActive(true);
      setStep('capture');
    } catch (err) {
      console.error('Fout bij het starten van de camera:', err);
      setError('We konden geen toegang krijgen tot je camera. Controleer of je camera werkt en of je toestemming hebt gegeven.');
    }
  };

  // Stop camera stream
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      const tracks = stream.getTracks();
      
      tracks.forEach(track => {
        track.stop();
      });
      
      videoRef.current.srcObject = null;
      setCameraActive(false);
    }
  };

  // Capture photo from video stream and detect face
  const capturePhoto = async () => {
    if (canvasRef.current && videoRef.current) {
      const context = canvasRef.current.getContext('2d');
      
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        
        context.drawImage(videoRef.current, 0, 0, videoRef.current.videoWidth, videoRef.current.videoHeight);
        
        const photoData = canvasRef.current.toDataURL('image/png');
        
        try {
          // Detecteer gezicht in de foto
          const result = await processImageForFaceDetection(photoData);
          
          if (result && result.descriptor) {
            // Als er een gezicht is gedetecteerd, sla zowel de foto als het resultaat op
            setCapturedPhotos(prev => [...prev, photoData]);
            setFaceDetectionResults(prev => [...prev, result]);
          } else {
            setError('Geen gezicht gedetecteerd. Zorg dat je gezicht goed zichtbaar is en probeer opnieuw.');
          }
        } catch (error) {
          console.error('Fout bij gezichtsdetectie:', error);
          setError('Fout bij het detecteren van een gezicht. Probeer opnieuw.');
        }
      }
    }
  };

  // Process captured photos for face recognition
  const processPhotos = async () => {
    if (capturedPhotos.length < 3 || faceDetectionResults.length < 3) {
      setError('Maak minstens 3 foto\'s om de gezichtsherkenning te optimaliseren.');
      return;
    }

    setError('');
    setStep('processing');
    setProcessing(true);

    try {
      // Verstuur de gezichtsdata naar de server
      const response = await fetch('/api/face/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Hier zou je een auth token moeten meesturen in een echte applicatie
        },
        body: JSON.stringify({
          faceData: faceDetectionResults
        }),
      });

      const data = await response.json();

      if (data.success) {
        setStep('complete');
      } else {
        throw new Error(data.message || 'Onbekende fout bij het registreren van je gezicht');
      }
    } catch (err: any) {
      console.error('Fout bij het verwerken van gezichtsdata:', err);
      setError(err.message || 'Er is een fout opgetreden bij het verwerken van je gezichtsdata. Probeer het opnieuw.');
      setStep('capture');
    } finally {
      setProcessing(false);
      stopCamera();
    }
  };

  // Reset het proces
  const resetProcess = () => {
    setCapturedPhotos([]);
    setError('');
    setStep('intro');
    stopCamera();
  };

  // Cleanup bij unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-3xl mx-auto py-10 px-4 sm:py-14 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {/* Stappen indicators */}
          <div className="px-4 py-5 sm:p-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">
                Gezichtsherkenning instellen
              </h2>
              <div className="flex space-x-1">
                {['intro', 'capture', 'processing', 'complete'].map((s, index) => (
                  <div 
                    key={s}
                    className={`h-2 w-10 rounded-full ${
                      ['intro', 'capture', 'processing', 'complete'].indexOf(step) >= index 
                        ? 'bg-blue-500' 
                        : 'bg-gray-200'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Inhoud op basis van stap */}
          <div className="px-4 py-5 sm:p-6">
            {error && (
              <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {step === 'intro' && (
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100">
                  <svg className="h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="mt-4 text-lg font-medium text-gray-900">Gezichtsherkenning instellen</h3>
                <p className="mt-2 text-sm text-gray-500">
                  Door je gezicht te registreren kunnen we je automatisch herkennen op roeifoto's.
                  We hebben hiervoor een paar foto's van je gezicht nodig.
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  Je privacy is belangrijk voor ons. Je gezichtsdata wordt veilig opgeslagen en alleen gebruikt
                  voor het matchen van foto's.
                </p>
                <div className="mt-6">
                  <button
                    type="button"
                    onClick={startCamera}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Start camera
                  </button>
                </div>
              </div>
            )}

            {step === 'capture' && (
              <div>
                <div className="flex flex-col items-center">
                  <div className="relative">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="rounded-lg shadow-lg max-w-full"
                      style={{ height: '300px' }}
                    />
                    <canvas ref={canvasRef} className="hidden" />
                  </div>

                  <div className="mt-6 flex space-x-3">
                    <button
                      type="button"
                      onClick={capturePhoto}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Foto maken
                    </button>
                    <button
                      type="button"
                      onClick={resetProcess}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Annuleren
                    </button>
                  </div>
                </div>

                {capturedPhotos.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-sm font-medium text-gray-900">Gemaakte foto's ({capturedPhotos.length}/5)</h3>
                    <p className="text-xs text-gray-500 mt-1">Maak vanuit verschillende hoeken foto's van je gezicht voor betere herkenning.</p>
                    
                    <div className="mt-3 grid grid-cols-5 gap-4">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <div 
                          key={index} 
                          className={`aspect-w-1 aspect-h-1 rounded-md bg-gray-100 overflow-hidden ${
                            index < capturedPhotos.length ? 'border-2 border-blue-500' : 'border border-gray-300'
                          }`}
                        >
                          {index < capturedPhotos.length ? (
                            <img 
                              src={capturedPhotos[index]} 
                              alt={`Gezichtsfoto ${index + 1}`} 
                              className="object-cover w-full h-full"
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full w-full">
                              <span className="text-2xl text-gray-300">{index + 1}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="mt-6">
                      <button
                        type="button"
                        onClick={processPhotos}
                        disabled={capturedPhotos.length < 3}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                      >
                        Verwerk foto's ({capturedPhotos.length} van minimaal 3)
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {step === 'processing' && (
              <div className="text-center py-6">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                <h3 className="mt-4 text-lg font-medium text-gray-900">Gezichtsherkenning wordt ingesteld</h3>
                <p className="mt-2 text-sm text-gray-500">
                  We verwerken je foto's en stellen de gezichtsherkenning in.
                  Dit duurt slechts enkele momenten...
                </p>
              </div>
            )}

            {step === 'complete' && (
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100">
                  <svg className="h-8 w-8 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="mt-4 text-lg font-medium text-gray-900">Gezichtsherkenning ingesteld!</h3>
                <p className="mt-2 text-sm text-gray-500">
                  Je gezichtsdata is succesvol verwerkt. We zullen je nu automatisch herkennen op roeifoto's.
                </p>
                <div className="mt-6">
                  <Link 
                    href="/dashboard" 
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Ga naar dashboard
                  </Link>
                </div>
              </div>
            )}
          </div>

          <div className="bg-gray-50 px-4 py-4 sm:px-6 border-t border-gray-200">
            <div className="text-xs text-gray-500">
              <p>We nemen je privacy serieus. Je gezichtsgegevens worden alleen gebruikt voor het herkennen van foto's en worden op onze beveiligde servers opgeslagen. Je kunt je gezichtsgegevens op elk moment verwijderen in je privacy-instellingen.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
