import React from 'react';
import './MainScreen.css';
import { Sparkles, Lollipop } from 'lucide-react';
import headerData from '../content/header.json';
import { generateImage, uploadImage } from '../api/client';
import { useGallery } from '../hooks/useGallery';
import { useUser } from '../context/UserContext';
import PreviewModal from './PreviewModal'; // New Import
import ManifestingImage from './ManifestingImage'; // New Import
import Skeleton from './Skeleton'; // New Import

import { usePhotoAction } from '../hooks/usePhotoAction';

import { useGeneration } from '../context/GenerationContext';

const Gallery = () => {
    // State for gallery images
    const [images, setImages] = React.useState([]);
    // Global generation state
    const { isGenerating, loadingWord, dots, previewUrl, startGeneration, stopGeneration } = useGeneration();
    const [selectedImage, setSelectedImage] = React.useState(null); // Preview State
    const [, setShowDebug] = React.useState(false); // Debug State

    // Handler for photo selection from CTA or other sources
    const handlePhotoSelected = async (file) => {
        if (!file) return;

        // 1. Show Preview immediately
        const objectUrl = URL.createObjectURL(file);
        startGeneration(objectUrl);

        try {
            // 2. Upload Image
            const imageUrl = await uploadImage(file);

            // 2.5 Calculate Aspect Ratio for Generation Size
            // 2.5 Aspect Ratio Check
            // NOTE: We Force 1024x1024 (Square) because 'gpt-image-1.5' (Edit/Img2Img) likely relies on DALL-E 2 logic
            // which center-crops non-square inputs or only supports square. 
            // Requesting Portrait (1024x1792) caused "Cut Top/Bottom" issues.
            let genSize = "1024x1024";
            /* 
            try {
                const img = new Image();
                img.src = objectUrl;
                await new Promise(resolve => { img.onload = resolve; });
                const ratio = img.width / img.height;

                if (ratio > 1.1) genSize = "1792x1024"; // Landscape
                else if (ratio < 0.9) genSize = "1024x1792"; // Portrait
                // else Square
                console.log(`📏 Auto Aspect Ratio: ${ratio.toFixed(2)} -> ${genSize}`);
            } catch (e) {
                console.warn("Aspect ratio check failed, defaulting to square", e);
            }
            */

            // 3. Generate with Special Prompt
            // Use 'header-special' as style_id or a generic one if not needed by backend for this specific flow
            // Ideally we should have a styleId but header.json doesn't have one. 
            // We'll pass 'header-special' which the backend might treat as valid or ignored depending on logic.
            // Or better: Use the first style ID or a dedicated one. 
            // For now, let's use a safe default "80s-studio" or similar if we knew it.
            // But since client.js uses it in model_config, let's pass 'header-special'.
            const result = await generateImage(
                headerData.specialPrompt,
                'header-special',
                'header-cta',
                { init_image: imageUrl, size: genSize }
            );

            // 4. Update Images (Handled by React Query or Manual Append)
            // Ideally we invalidate query, but for instant feedback we append:
            const newImage = {
                id: Date.now(), // Temp ID
                src: result.image_url,
                created_at: new Date().toISOString()
            };
            setImages(prev => [newImage, ...prev]);
            localStorage.setItem('user_has_photos', 'true');

        } catch (err) {
            console.error("Generation failed:", err);
            // Ideally show error toast
        } finally {
            stopGeneration();
        }
    };

    const { triggerPhotoAction, actionSheetUI } = usePhotoAction({
        onPhotoSelected: handlePhotoSelected
    });

    // Gallery 2.0: Infinite Scroll State
    const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useGallery();

    // Initialize debug state
    React.useEffect(() => {
        if (typeof window !== 'undefined') {
            // We can't use lazy init for useState because we are in a component that might be SSR'd?
            // Actually, just suppress the lint. It's safe here (run once).
            const params = new URLSearchParams(window.location.search);
            if (params.get('debug') === '1') {
                setShowDebug(true);
            }
        }
    }, []);

    // Sync React Query data to local state AND update localStorage cache
    React.useEffect(() => {
        if (data) {
            const allImages = data.pages.flatMap(page => page.items);
            if (allImages.length > 0) {
                localStorage.setItem('user_has_photos', 'true');
                setImages(prev => {
                    const existingIds = new Set(prev.map(img => img.id));
                    const newItems = allImages.filter(h => !existingIds.has(h.id));
                    return [...newItems, ...prev].sort((a, b) => b.created_at?.localeCompare(a.created_at) || 0);
                });
            } else {
                // Only set to false if we have fetched and confirmed 0 items and no local generation is happening
                if (!isGenerating && images.length === 0) {
                    localStorage.setItem('user_has_photos', 'false');
                }
            }
        }
    }, [data, isGenerating, images.length]);

    // Fast Check: Use localStorage to determine if we should show skeleton
    // Default to false (Empty State) if not set, to satisfy "no skeleton for empty users" request
    const cachedHasPhotos = React.useMemo(() => localStorage.getItem('user_has_photos') === 'true', []);

    // Show loading IF: We are generating OR (We are loading AND we think user has photos)
    // If We are loading but think user has NO photos -> fall through to Empty State
    const showLoading = isGenerating || (isLoading && cachedHasPhotos);

    // Helper to scroll to styles - Unused for now
    // const scrollToStyles = () => {
    //     const stylesSection = document.querySelector('.h-scroll-list');
    //     if (stylesSection) stylesSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    // };

    // Updated CTA Handler
    // Updated CTA Handler
    const { user, openPaywall } = useUser();

    const handleGenerate = async () => {
        if (!user || user.credits <= 0) {
            openPaywall();
            return;
        }
        triggerPhotoAction({
            title: headerData.ctaButtonText || "Try a Style",
            subtitle: "Choose a photo to get started"
        });
    };

    return (
        <div className="section-container">
            {actionSheetUI}
            <div className="section-header">My images</div>

            {(showLoading || images.length > 0) ? (
                <div className="gallery-grid">
                    {/* Loading Placeholder for Generation */}
                    {isGenerating && (
                        <div className="gallery-item loading-placeholder animate-enter">
                            {/* Preview Background */}
                            {previewUrl && (
                                <img
                                    src={previewUrl}
                                    alt="Preview"
                                    style={{
                                        position: 'absolute',
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover',
                                        filter: 'blur(4px) brightness(0.7)'
                                    }}
                                />
                            )}

                            <div className="loading-blur" style={previewUrl ? { backdropFilter: 'none', background: 'transparent' } : {}}>
                                <Lollipop size={48} color="#ffffff" className="lollipop-spinner" />
                                <div className="loading-text-wrapper" style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <span className="loading-text">{loadingWord}</span>
                                    <span style={{ position: 'absolute', left: '100%', marginLeft: '2px', width: '24px', textAlign: 'left' }} className="loading-text">
                                        {dots}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {isLoading && !isGenerating && (
                        Array.from({ length: 4 }).map((_, i) => (
                            <div key={`skeleton-${i}`} className="gallery-item" style={{ overflow: 'hidden' }}>
                                <Skeleton width="100%" height="100%" borderRadius="0" />
                            </div>
                        ))
                    )}

                    {/* Render Images */}
                    {images.map((img, index) => (
                        <div key={img.id} className="gallery-item" onClick={() => setSelectedImage(img)}>
                            {index === 0 && previewUrl ? (
                                <ManifestingImage
                                    src={img.src}
                                    previewUrl={previewUrl}
                                    alt={`Gallery ${img.id}`}
                                    className="manifest-img"
                                />
                            ) : (
                                <img src={img.src} alt={`Gallery ${img.id}`} loading="lazy" />
                            )}
                        </div>
                    ))}

                    {/* Load More Button (Infinite Scroll Trigger) */}
                    {hasNextPage && (
                        <div className="gallery-load-more" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '20px' }}>
                            <button
                                onClick={() => fetchNextPage()}
                                disabled={isFetchingNextPage}
                                className="cta-button"
                                style={{ fontSize: '14px', padding: '8px 16px' }}
                            >
                                {isFetchingNextPage ? 'Loading more...' : 'Load More'}
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                <div className="gallery-empty-state">
                    <div className="empty-icon-bg">
                        <Lollipop size={48} color="#ffffff" className="lollipop-spinner" />
                    </div>
                    <h3>Start your journey</h3>
                    <p>Create your first masterpiece using our AI styles</p>
                    <button className="cta-button" onClick={handleGenerate}>
                        {headerData.ctaButtonText || "Try a Style"}
                    </button>
                </div>
            )}

            {/* Preview Modal */}
            <PreviewModal
                image={selectedImage}
                onClose={() => setSelectedImage(null)}
            />
        </div>
    );
};

export default Gallery;
