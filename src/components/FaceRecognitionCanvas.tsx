"use client";

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface FaceBox {
  id: string;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  rower?: {
    id: string;
    name: string;
    teamName?: string;
  };
  confidence?: number;
  matchId?: string;
}

interface FaceRecognitionCanvasProps {
  imageUrl: string;
  faces: FaceBox[];
  onFaceClick?: (face: FaceBox) => void;
  interactive?: boolean;
  showLabels?: boolean;
}

export default function FaceRecognitionCanvas({
  imageUrl,
  faces,
  onFaceClick,
  interactive = true,
  showLabels = true
}: FaceRecognitionCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [scale, setScale] = useState(1);
  const [tooltipInfo, setTooltipInfo] = useState<{
    face: FaceBox;
    x: number;
    y: number;
  } | null>(null);
  
  // Laad de afbeelding en bereken de juiste dimensies
  useEffect(() => {
    if (!imageUrl) return;
    
    const img = new Image();
    img.onload = () => {
      if (!containerRef.current) return;
      
      const containerWidth = containerRef.current.clientWidth;
      const imgAspectRatio = img.width / img.height;
      
      let canvasWidth = containerWidth;
      let canvasHeight = containerWidth / imgAspectRatio;
      
      setDimensions({
        width: canvasWidth,
        height: canvasHeight
      });
      
      setScale(canvasWidth / img.width);
      
      if (imageRef.current) {
        imageRef.current.src = img.src;
      }
    };
    
    img.src = imageUrl;
  }, [imageUrl]);
  
  // Teken de gezichtsboxen op het canvas
  useEffect(() => {
    if (!canvasRef.current || dimensions.width === 0 || !faces.length) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Canvas opnieuw instellen
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Teken de afbeelding als referentie (maar transparant)
    if (imageRef.current) {
      ctx.globalAlpha = 0.0; // Volledig transparant maken
      ctx.drawImage(imageRef.current, 0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 1.0;
    }
    
    // Teken de gezichtsboxen
    faces.forEach(face => {
      const { x, y, width, height } = face.boundingBox;
      
      // Schaal bounding box naar canvas grootte
      const scaledX = x * scale;
      const scaledY = y * scale;
      const scaledWidth = width * scale;
      const scaledHeight = height * scale;
      
      // Bereken kleur op basis van confidence (rood = laag, groen = hoog)
      const confidenceColor = face.confidence 
        ? `rgba(${Math.round(255 * (1 - face.confidence))}, ${Math.round(255 * face.confidence)}, 0, 0.7)`
        : 'rgba(255, 255, 0, 0.7)';
      
      // Teken bounding box
      ctx.strokeStyle = face.rower ? 'rgba(0, 200, 0, 0.8)' : confidenceColor;
      ctx.lineWidth = 2;
      ctx.strokeRect(scaledX, scaledY, scaledWidth, scaledHeight);
      
      // Voeg een subtiele achtergrond toe voor de naam
      if (showLabels && face.rower) {
        const labelText = `${face.rower.name} (${Math.round((face.confidence || 0) * 100)}%)`;
        const padding = 4;
        const textWidth = ctx.measureText(labelText).width + padding * 2;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(
          scaledX, 
          scaledY + scaledHeight,
          textWidth,
          20
        );
        
        // Teken naam label
        ctx.fillStyle = '#ffffff';
        ctx.font = '14px Arial';
        ctx.fillText(
          labelText,
          scaledX + padding,
          scaledY + scaledHeight + 15
        );
      }
    });
  }, [dimensions, faces, scale, showLabels]);
  
  // Event handlers voor interactiviteit
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!interactive || !canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Controleer of de muis over een gezicht gaat
    const hoveredFace = faces.find(face => {
      const scaledX = face.boundingBox.x * scale;
      const scaledY = face.boundingBox.y * scale;
      const scaledWidth = face.boundingBox.width * scale;
      const scaledHeight = face.boundingBox.height * scale;
      
      return (
        x >= scaledX && 
        x <= scaledX + scaledWidth &&
        y >= scaledY && 
        y <= scaledY + scaledHeight
      );
    });
    
    if (hoveredFace) {
      setTooltipInfo({
        face: hoveredFace,
        x: e.clientX,
        y: e.clientY
      });
      
      if (canvasRef.current) {
        canvasRef.current.style.cursor = 'pointer';
      }
    } else {
      setTooltipInfo(null);
      
      if (canvasRef.current) {
        canvasRef.current.style.cursor = 'default';
      }
    }
  };
  
  const handleMouseLeave = () => {
    setTooltipInfo(null);
    
    if (canvasRef.current) {
      canvasRef.current.style.cursor = 'default';
    }
  };
  
  const handleClick = (e: React.MouseEvent) => {
    if (!interactive || !canvasRef.current || !onFaceClick) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Controleer of er op een gezicht is geklikt
    const clickedFace = faces.find(face => {
      const scaledX = face.boundingBox.x * scale;
      const scaledY = face.boundingBox.y * scale;
      const scaledWidth = face.boundingBox.width * scale;
      const scaledHeight = face.boundingBox.height * scale;
      
      return (
        x >= scaledX && 
        x <= scaledX + scaledWidth &&
        y >= scaledY && 
        y <= scaledY + scaledHeight
      );
    });
    
    if (clickedFace && onFaceClick) {
      onFaceClick(clickedFace);
    }
  };
  
  return (
    <div ref={containerRef} className="relative w-full h-auto">
      <div className="relative" style={{ width: dimensions.width, height: dimensions.height }}>
        <img
          ref={imageRef}
          src={imageUrl}
          alt="Foto met gezichtsherkenning"
          className="absolute top-0 left-0 w-full h-full object-contain"
        />
        <canvas
          ref={canvasRef}
          width={dimensions.width}
          height={dimensions.height}
          className="absolute top-0 left-0 w-full h-full"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
        />
      </div>
      
      {tooltipInfo && typeof window !== 'undefined' && createPortal(
        <div 
          className="absolute bg-black bg-opacity-80 text-white p-2 rounded text-sm z-50"
          style={{
            left: tooltipInfo.x + 10,
            top: tooltipInfo.y + 10,
            pointerEvents: 'none'
          }}
        >
          {tooltipInfo.face.rower ? (
            <div>
              <p className="font-bold">{tooltipInfo.face.rower.name}</p>
              {tooltipInfo.face.rower.teamName && (
                <p className="text-xs opacity-80">{tooltipInfo.face.rower.teamName}</p>
              )}
              {tooltipInfo.face.confidence && (
                <p className="text-xs mt-1">
                  Betrouwbaarheid: {Math.round(tooltipInfo.face.confidence * 100)}%
                </p>
              )}
            </div>
          ) : (
            <div>
              <p className="font-bold">Onbekend gezicht</p>
              <p className="text-xs">Klik om te identificeren</p>
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
