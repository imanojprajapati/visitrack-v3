'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

const VideoBackground = () => {
  const [videoError, setVideoError] = useState(false);

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden">
      <div className="relative w-full h-full">
        <iframe
          src="https://www.youtube.com/embed/0gqcSjM0NQY?autoplay=1&mute=1&loop=1&playlist=0gqcSjM0NQY&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1&enablejsapi=1"
          className="absolute top-0 left-0 w-full h-full"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            pointerEvents: 'none',
            zIndex: 0,
            border: 'none',
            margin: 0,
            padding: 0
          }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
        <div 
          className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-transparent"
          style={{ zIndex: 1 }}
        />
      </div>
    </div>
  );
};

export default VideoBackground; 