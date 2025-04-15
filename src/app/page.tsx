'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { getPhotosByPhotographer } from '@/lib/storage-firebase'

export default function Home() {
  const [photos, setPhotos] = useState<string[]>([])
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)

  useEffect(() => {
    async function fetchPhotos() {
      try {
        // Vervang 'PHOTOGRAPHER_ID' met de werkelijke fotografen-ID
        const photographerPhotos = await getPhotosByPhotographer('PHOTOGRAPHER_ID', { limit: 10 })
        const base64Photos = photographerPhotos
          .filter(photo => photo.base64)
          .map(photo => photo.base64!)
        
        setPhotos(base64Photos)
      } catch (error) {
        console.error('Fout bij ophalen foto\'s:', error)
      }
    }

    fetchPhotos()
    const intervalId = setInterval(() => {
      setCurrentPhotoIndex(prevIndex => 
        (prevIndex + 1) % photos.length
      )
    }, 30000) // Elke 30 seconden

    return () => clearInterval(intervalId)
  }, [photos.length])

  return (
    <main className="min-h-screen bg-gradient-to-br from-roeiphotos-gradient-start via-roeiphotos-gradient-middle to-roeiphotos-gradient-end bg-size-400 animate-gradient-rotate flex flex-col items-center justify-center p-24 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-roeiphotos-gradient-start via-roeiphotos-gradient-middle to-roeiphotos-gradient-end opacity-50 animate-gradient-x"></div>
      
      <div className="relative z-10 text-center">
        <h1 className="text-6xl font-extrabold text-white mb-8 animate-pulse-slow">
          RoeiPhotos
        </h1>
        
        {photos.length > 0 && (
          <div className="relative w-96 h-96 rounded-2xl overflow-hidden shadow-2xl transform transition-all duration-500 hover:scale-105 hover:rotate-3 hover:shadow-2xl">
            <Image
              src={photos[currentPhotoIndex]}
              alt={`Foto ${currentPhotoIndex + 1}`}
              fill
              style={{ objectFit: 'cover' }}
              className="transition-all duration-1000 ease-in-out hover:brightness-110"
              priority
            />
          </div>
        )}

        <div className="mt-8 space-x-4">
          <Link href="/photos" className="bg-roeiphotos-500/20 hover:bg-roeiphotos-500/40 text-white px-6 py-3 rounded-full transition-all inline-block animate-bounce-slow">
            Bekijk Alle Foto's
          </Link>
          <Link href="/upload" className="bg-roeiphotos-600/20 hover:bg-roeiphotos-600/40 text-white px-6 py-3 rounded-full transition-all inline-block animate-bounce-slow">
            Upload Foto
          </Link>
        </div>
      </div>
    </main>
  )
}
