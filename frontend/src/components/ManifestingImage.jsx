import React, { useState } from 'react';

const ManifestingImage = ({ src, previewUrl, alt, className, style, ...props }) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);

    // Reset state if src changes (e.g. from recycling)
    React.useEffect(() => {
        setIsLoaded(false);
        setHasError(false);
    }, [src]);

    return (
        <div className={`manifest-container ${className || ''}`} style={{ position: 'relative', overflow: 'hidden', ...style }}>
            {/* 1. Preview / Placeholder Layer (Background) */}
            {/* Always visible until covered by the loaded image, or strictly hidden if we want to save GPU? 
                Better to keep it to prevent any pixel gap. */}
            {previewUrl && (
                <img
                    src={previewUrl}
                    alt=""
                    style={{
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        filter: 'blur(10px) brightness(0.8)', // Stronger blur for "dreamy" start
                        transform: 'scale(1.1)', // Prevent blur edges
                        zIndex: 1,
                        transition: 'opacity 0.8s ease-out',
                        opacity: isLoaded ? 0 : 1 // Optional: fade out preview once loaded? Or just cover it. Fading out is cleaner if transparent.
                    }}
                    aria-hidden="true"
                />
            )}

            {/* 2. Final Result Layer (Foreground) */}
            <img
                src={src}
                alt={alt}
                {...props}
                onLoad={() => setIsLoaded(true)}
                onError={() => setHasError(true)}
                style={{
                    position: 'relative', // Ensure it takes space if needed, or absolute if container is fixed
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    zIndex: 2,
                    opacity: isLoaded ? 1 : 0,
                    transition: 'opacity 1s cubic-bezier(0.2, 0.8, 0.2, 1), filter 1s ease-out',
                    filter: isLoaded ? 'blur(0px)' : 'blur(8px)', // Unblur effect
                    willChange: 'opacity, filter',
                }}
            />
        </div>
    );
};

export default ManifestingImage;
