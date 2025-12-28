import React, { useState } from 'react';
import Skeleton from './Skeleton';

const FadeImage = ({ src, alt, className, style, width, height, ...props }) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);

    // Reset state and Pre-load image
    React.useEffect(() => {
        setIsLoaded(false);
        setHasError(false);

        const img = new Image();
        img.src = src;

        // Use decode() to ensure it's ready for painting
        img.decode()
            .then(() => {
                setIsLoaded(true);
            })
            .catch((err) => {
                // Fallback for decode error or load error
                console.warn("Image decode failed, falling back to load", err);
                img.onload = () => setIsLoaded(true);
            });

        img.onerror = () => setHasError(true);

        return () => {
            img.onload = null;
            img.onerror = null;
        };
    }, [src]);

    return (
        <div className={`fade-image-container ${className || ''}`} style={{ position: 'relative', width: width || '100%', height: height || '100%', overflow: 'hidden', ...style }}>
            {/* 1. Loading Skeleton (Visible until loaded) */}
            {!isLoaded && !hasError && (
                <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
                    <Skeleton width="100%" height="100%" borderRadius="0" />
                </div>
            )}

            {/* 2. Actual Image */}
            <img
                src={src}
                alt={alt}
                {...props}
                // No onLoad handler needed here as we pre-loaded it
                // We keep onError just in case the DOM element fails differently
                onError={() => setHasError(true)}
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    zIndex: 2,
                    opacity: isLoaded ? 1 : 0,
                    transition: 'opacity 0.6s ease-out',
                    willChange: 'opacity',
                    display: hasError ? 'none' : 'block'
                }}
            />

            {/* 3. Error Fallback */}
            {hasError && (
                <div style={{
                    position: 'absolute', inset: 0, zIndex: 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: '#2a2a2a', color: '#666', fontSize: '12px'
                }}>
                    Failed to load
                </div>
            )}
        </div>
    );
};

export default FadeImage;
