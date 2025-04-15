"use client";

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { uploadMultiplePhotos } from '@/lib/supabase';

type PhotoUploaderProps = {
  folderPath: string;
  onUploadComplete?: (urls: { path: string; url: string }[]) => void;
  onUploadError?: (error: Error) => void;
  maxFiles?: number;
};

export default function PhotoUploader({
  folderPath,
  onUploadComplete,
  onUploadError,
  maxFiles = 10
}: PhotoUploaderProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    // Filter voor alleen afbeeldingen
    const imageFiles = acceptedFiles.filter(file => 
      file.type.startsWith('image/')
    );
    
    // Controleer of we niet over het maximum aantal bestanden gaan
    const newTotalFiles = files.length + imageFiles.length;
    if (newTotalFiles > maxFiles) {
      setError(`Je kunt maximaal ${maxFiles} bestanden uploaden. Selecteer minder bestanden.`);
      return;
    }
    
    setFiles(prev => [...prev, ...imageFiles]);
    setError(null);
  }, [files.length, maxFiles]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif']
    },
    maxSize: 10485760, // 10MB
  });

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      setError('Selecteer minstens één foto om te uploaden.');
      return;
    }

    setError(null);
    setUploading(true);
    
    try {
      // Simuleer upload voortgang
      const updateProgress = () => {
        let progress = 0;
        const interval = setInterval(() => {
          progress += 5;
          setUploadProgress(Math.min(progress, 95)); // Tot 95% voor upload
          if (progress >= 95) clearInterval(interval);
        }, 200);
        return interval;
      };
      
      const progressInterval = updateProgress();
      
      // Upload de bestanden naar Supabase
      const uploadedFiles = await uploadMultiplePhotos(files, folderPath);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      // Roep callback aan indien aanwezig
      if (onUploadComplete) {
        onUploadComplete(uploadedFiles);
      }
      
      // Reset bestanden na succesvolle upload
      setTimeout(() => {
        setFiles([]);
        setUploading(false);
        setUploadProgress(0);
      }, 1500);
      
    } catch (err) {
      console.error('Upload error:', err);
      setError('Er is een fout opgetreden bij het uploaden. Probeer het opnieuw.');
      
      if (onUploadError && err instanceof Error) {
        onUploadError(err);
      }
      
      setUploading(false);
    }
  };

  return (
    <div className="w-full">
      {error && (
        <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4">
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

      <div
        {...getRootProps()}
        className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md ${
          isDragActive 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-blue-400'
        } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input {...getInputProps()} disabled={uploading} />
        <div className="space-y-1 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
            aria-hidden="true"
          >
            <path
              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div className="flex text-sm text-gray-600">
            <label
              htmlFor="file-upload"
              className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none"
            >
              <span>{isDragActive ? 'Drop de bestanden hier...' : 'Sleep foto\'s hierheen of klik om te bladeren'}</span>
            </label>
          </div>
          <p className="text-xs text-gray-500">JPEG, PNG, GIF tot 10MB (max. {maxFiles} bestanden)</p>
        </div>
      </div>

      {/* Preview van geüploade bestanden */}
      {files.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-medium text-gray-900">Geselecteerde bestanden ({files.length})</h3>
          <ul className="mt-2 divide-y divide-gray-200 max-h-60 overflow-y-auto">
            {files.map((file, index) => (
              <li key={`${file.name}-${index}`} className="py-3 flex justify-between items-center">
                <div className="flex items-center">
                  <svg className="h-5 w-5 text-gray-400 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <div className="text-sm truncate max-w-xs">{file.name}</div>
                  <div className="text-xs text-gray-500 ml-2">({(file.size / 1024 / 1024).toFixed(2)} MB)</div>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="text-red-500 hover:text-red-700"
                  disabled={uploading}
                >
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span className="sr-only">Verwijder bestand</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Upload knop */}
      <div className="mt-4">
        <button
          type="button"
          onClick={handleUpload}
          disabled={uploading || files.length === 0}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {uploading ? 'Bezig met uploaden...' : 'Upload foto\'s'}
        </button>
      </div>

      {/* Upload voortgang */}
      {uploading && (
        <div className="mt-4">
          <h3 className="text-sm font-medium text-gray-900">Upload voortgang</h3>
          <div className="mt-2 w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            {uploadProgress < 100 
              ? `Uploaden: ${uploadProgress}% voltooid...` 
              : 'Upload voltooid!'}
          </p>
        </div>
      )}
    </div>
  );
}
